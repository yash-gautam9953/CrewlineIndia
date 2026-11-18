import { NextResponse } from "next/server";
import { Storage } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to access the payment proof." }, { status: 401 });
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_PAYMENTS_TABLE_ID;
  const bucketId = process.env.APPWRITE_SUBMISSIONS_BUCKET_ID;
  if (!service || !tableId || !bucketId) return NextResponse.json({ error: "Payment storage is not configured." }, { status: 503 });
  const { paymentId } = await params;
  try {
    const payment = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId, rowId: paymentId }) as Record<string, unknown>;
    if (payment.studentId !== session.user.$id && !await getAdminUser()) return NextResponse.json({ error: "Payment proof not found." }, { status: 404 });
    if (typeof payment.proofFileId !== "string" || !payment.proofFileId) return NextResponse.json({ error: "No proof file is attached." }, { status: 404 });
    const file = await new Storage(service.client).getFile({ bucketId, fileId: payment.proofFileId });
    const bytes = await new Storage(service.client).getFileDownload({ bucketId, fileId: payment.proofFileId });
    const filename = file.name.replace(/[\r\n"\\/]/g, "_");
    return new NextResponse(bytes, { headers: { "content-type": file.mimeType || "application/octet-stream", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox" } });
  } catch { return NextResponse.json({ error: "Payment proof not found." }, { status: 404 }); }
}
