import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import { writeAuditLog, getDocumentsConfig } from "@/lib/documents/document-service";

const schema = z.object({ status: z.enum(["verified", "rejected", "waived"]), reason: z.string().trim().max(2000).optional().default("") }).refine((value) => value.status === "verified" || value.reason.length >= 10, "Provide a reason when rejecting or waiving a payment request.");

export async function PATCH(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  if (isRateLimited(request, "payment-verify", 30)) return NextResponse.json({ error: "Too many payment verification changes." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choose a payment decision and enter a reason if rejecting or waiving." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_PAYMENTS_TABLE_ID;
  if (!service || !tableId) return NextResponse.json({ error: "Payment service is not configured." }, { status: 503 });
  const { paymentId } = await params;
  try {
    const payment = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId, rowId: paymentId }) as Record<string, unknown>;
    if (!(["submitted", "pending"].includes(String(payment.status)))) return NextResponse.json({ error: "This payment is already verified or cannot be changed." }, { status: 409 });
    if (input.data.status === "verified" && payment.status !== "submitted") return NextResponse.json({ error: "A student must submit a transaction reference before verification." }, { status: 409 });
    const verifiedAt = new Date().toISOString();
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: paymentId, data: { status: input.data.status, verificationReason: input.data.reason || null, verifiedBy: admin.$id, verifiedAt } });
    const title = input.data.status === "verified" ? "Payment verified" : input.data.status === "waived" ? "Payment requirement waived" : "Payment needs attention";
    const body = input.data.status === "verified" ? "Crewline verified your submitted payment." : `${title}. ${input.data.reason}`;
    await createNotification({ userId: String(payment.studentId), eventKey: `payment-decision:${paymentId}:${input.data.status}:${verifiedAt}`, title, body, type: "payment", targetUrl: "/account" }).catch(() => undefined);
    const documentsConfig = getDocumentsConfig();
    if (documentsConfig) await writeAuditLog(documentsConfig, admin.$id, `payment.${input.data.status}`, paymentId, { enrollmentId: payment.enrollmentId, reason: input.data.reason }, "payment");
    return NextResponse.json({ verified: input.data.status === "verified", status: input.data.status });
  } catch { return NextResponse.json({ error: "Payment record could not be found or updated." }, { status: 404 }); }
}
