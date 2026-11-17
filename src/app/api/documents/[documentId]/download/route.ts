import { NextResponse } from "next/server";
import { Storage } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to access your documents." }, { status: 401 });
  const config = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_DOCUMENTS_TABLE_ID;
  const bucketId = process.env.APPWRITE_DOCUMENTS_BUCKET_ID;
  if (!config || !tableId || !bucketId) return NextResponse.json({ error: "Document storage is not configured." }, { status: 503 });
  const { documentId } = await params;
  try {
    const document = await config.tablesDB.getRow({ databaseId: config.databaseId, tableId, rowId: documentId }) as Record<string, unknown>;
    const isAdmin = Boolean(await getAdminUser());
    if (document.studentId !== session.user.$id && !isAdmin) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    if (document.status !== "valid") return NextResponse.json({ error: "This document has been revoked and is not available for download." }, { status: 410 });
    if (typeof document.storageFileId !== "string") return NextResponse.json({ error: "Document file is unavailable." }, { status: 404 });
    const bytes = await new Storage(config.client).getFileDownload({ bucketId, fileId: document.storageFileId });
    return new NextResponse(bytes, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${documentId}.pdf"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox" } });
  } catch { return NextResponse.json({ error: "Document not found." }, { status: 404 }); }
}
