import { NextResponse } from "next/server";
import { ID, Permission, Query, Role } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({ enrollmentId: z.string().min(1).max(64), amountDue: z.coerce.number().int().positive().max(100000000), instructions: z.string().trim().min(10).max(2000) });

export async function POST(request: Request) {
  if (isRateLimited(request, "admin-payment-request", 20)) return NextResponse.json({ error: "Too many payment changes. Try again shortly." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter an enrollment, disclosed amount, and payment instructions." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const enrollmentTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const paymentTable = process.env.APPWRITE_PAYMENTS_TABLE_ID;
  if (!service || !enrollmentTable || !paymentTable) return NextResponse.json({ error: "Payment service is not configured." }, { status: 503 });
  try {
    const enrollment = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: enrollmentTable, rowId: input.data.enrollmentId });
    if (!["active", "completed"].includes(String(enrollment.status))) return NextResponse.json({ error: "Only active or completed enrollments can have a payment request." }, { status: 409 });
    const existing = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentTable, queries: [Query.equal("enrollmentId", enrollment.$id), Query.limit(1)] });
    const record = existing.rows[0];
    if (record && !["not_applicable", "rejected"].includes(String(record.status))) return NextResponse.json({ error: "A payment request or verification is already in progress for this enrollment." }, { status: 409 });
    const data = { studentId: enrollment.studentId, applicationId: enrollment.applicationId, enrollmentId: enrollment.$id, amountDue: input.data.amountDue, currency: "INR", paymentInstructions: input.data.instructions, status: "pending", transactionReference: null, proofFileId: null, verificationReason: null, verifiedBy: null, verifiedAt: null, createdBy: admin.$id, createdAt: new Date().toISOString() };
    const payment = record
      ? await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId: paymentTable, rowId: record.$id, data })
      : await service.tablesDB.createRow({ databaseId: service.databaseId, tableId: paymentTable, rowId: ID.unique(), data, permissions: [Permission.read(Role.user(String(enrollment.studentId)))] });
    return NextResponse.json({ paymentId: payment.$id }, { status: record ? 200 : 201 });
  } catch { return NextResponse.json({ error: "Could not create the payment request." }, { status: 500 }); }
}
