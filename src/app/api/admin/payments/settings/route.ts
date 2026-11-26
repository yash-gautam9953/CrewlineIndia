import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security";
import { readPaymentSettings, savePaymentSettings } from "@/lib/payment-settings";

const schema = z.object({
  googleFormUrl: z.url({ protocol: /^https$/ }).max(2048),
  feeAmount: z.union([z.literal(""), z.null(), z.coerce.number().int().positive().max(1000000)]).optional().default(""),
  instructions: z.string().trim().max(2000).optional().default(""),
});

export async function GET() {
  if (!await getAdminUser()) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }
  const settings = await readPaymentSettings();
  return NextResponse.json(settings, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }
  if ((await checkRateLimit(request, "admin-payment-settings", 20)).limited) {
    return NextResponse.json({ error: "Too many settings updates. Try again shortly." }, { status: 429 });
  }
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid HTTPS Google Form URL." },
      { status: 400 }
    );
  }

  try {
    const feeAmount = parsed.data.feeAmount === "" || parsed.data.feeAmount === null ? null : parsed.data.feeAmount;
    await savePaymentSettings(admin.$id, {
      googleFormUrl: parsed.data.googleFormUrl.trim(),
      feeAmount,
      instructions: parsed.data.instructions.trim() || "Scan the UPI QR inside the Google Form, complete the payment, and submit your UPI Transaction ID / UTR below for admin verification.",
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save payment settings." },
      { status: 500 }
    );
  }
}
