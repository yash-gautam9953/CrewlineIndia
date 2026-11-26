import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security";
import { writeAuditLog, getDocumentsConfig } from "@/lib/documents/document-service";
import { paymentVerificationEmail, sendCrewlineEmail } from "@/lib/email";

const schema = z.object({ status: z.enum(["verified", "rejected", "waived"]), reason: z.string().trim().max(2000).optional().default("") }).refine((value) => value.status === "verified" || value.reason.length >= 10, "Provide a reason when rejecting or waiving a payment request.");

export async function PATCH(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  if (!isTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  if ((await checkRateLimit(request, "payment-verify", 30)).limited) return NextResponse.json({ error: "Too many payment verification changes." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choose a payment decision and enter a reason if rejecting or waiving." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Payment service is not configured." }, { status: 503 });
  const tableId = resources.tables.payments;
  const { paymentId } = await params;
  try {
    const payment = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId, rowId: paymentId }) as Record<string, unknown>;
    if (!(["submitted", "pending", "not_applicable"].includes(String(payment.status)))) return NextResponse.json({ error: "This payment is already verified or cannot be changed." }, { status: 409 });
    const verifiedAt = new Date().toISOString();
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: paymentId, data: { status: input.data.status, verificationReason: input.data.reason || null, verifiedBy: admin.$id, verifiedAt } });
    const documentsConfig = await getDocumentsConfig();
    if (documentsConfig) await writeAuditLog(documentsConfig, admin.$id, `payment.${input.data.status}`, paymentId, { enrollmentId: payment.enrollmentId, reason: input.data.reason }, "payment");
    if (typeof payment.studentId === "string" && payment.studentId) {
      await sendCrewlineEmail({
        userId: payment.studentId,
        subject: `Crewline payment update: ${input.data.status}`,
        html: paymentVerificationEmail({ status: input.data.status, reason: input.data.reason }),
      });
    }
    return NextResponse.json({ verified: input.data.status === "verified", status: input.data.status });
  } catch { return NextResponse.json({ error: "Payment record could not be found or updated." }, { status: 404 }); }
}
