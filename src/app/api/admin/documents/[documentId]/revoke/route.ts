import { NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { isRateLimited } from "@/lib/rate-limit";
import { getDocumentsConfig, writeAuditLog } from "@/lib/documents/document-service";

const schema = z.object({ reason: z.string().trim().min(10).max(2000) });
export async function PATCH(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  if (isRateLimited(request, "document-revoke", 10)) return NextResponse.json({ error: "Too many revocation requests." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Provide a reason of at least 10 characters." }, { status: 400 });
  const config = getDocumentsConfig();
  if (!config) return NextResponse.json({ error: "Document storage is not configured." }, { status: 503 });
  const { documentId } = await params;
  try {
    const document = await config.tablesDB.getRow({ databaseId: config.databaseId, tableId: config.tableId, rowId: documentId }) as Record<string, unknown>;
    if (document.documentType === "offer") return NextResponse.json({ error: "Offer letters are private records and cannot be revoked through certificate verification." }, { status: 409 });
    if (document.status === "revoked") return NextResponse.json({ error: "This certificate is already revoked." }, { status: 409 });
    const revokedAt = new Date().toISOString();
    await config.tablesDB.updateRow({ databaseId: config.databaseId, tableId: config.tableId, rowId: documentId, data: { status: "revoked", revokedAt, revocationReason: input.data.reason } });
    const revocationTable = process.env.APPWRITE_CERTIFICATE_REVOCATIONS_TABLE_ID;
    if (revocationTable) {
      try {
        const existing = await config.tablesDB.listRows({ databaseId: config.databaseId, tableId: revocationTable, queries: [Query.equal("certificateId", documentId), Query.limit(1)] });
        if (!existing.total) await config.tablesDB.createRow({ databaseId: config.databaseId, tableId: revocationTable, rowId: ID.unique(), data: { certificateId: documentId, revokedBy: admin.$id, reason: input.data.reason, revokedAt } });
      } catch { /* document status is the authoritative revocation flag */ }
    }
    await writeAuditLog(config, admin.$id, "document.revoked", documentId, { type: document.documentType, reason: input.data.reason });
    return NextResponse.json({ revoked: true });
  } catch { return NextResponse.json({ error: "Certificate was not found or revocation could not be saved." }, { status: 404 }); }
}
