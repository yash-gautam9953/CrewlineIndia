import { NextResponse } from "next/server";
import { Storage } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to access your documents." }, { status: 401 });
  const config = createPrivilegedAppwriteClient();
  const resources = config ? await getAppwriteResources().catch(() => null) : null;
  if (!config || !resources) return NextResponse.json({ error: "Document storage is not configured." }, { status: 503 });
  const tableId = resources.tables.documents;
  const bucketId = resources.buckets.documentsBucket;
  const { documentId } = await params;
  try {
    const document = await config.tablesDB.getRow({ databaseId: config.databaseId, tableId, rowId: documentId }) as Record<string, unknown>;
    const isAdmin = Boolean(await getAdminUser());
    if (document.studentId !== session.user.$id && !isAdmin) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    if (document.status !== "valid") return NextResponse.json({ error: "This document is not active or available for download." }, { status: 410 });
    if (typeof document.storageFileId !== "string") return NextResponse.json({ error: "Document file is unavailable." }, { status: 404 });
    const bytes = await new Storage(config.client).getFileDownload({ bucketId, fileId: document.storageFileId });
    return new NextResponse(bytes, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${documentId}.pdf"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox" } });
  } catch { return NextResponse.json({ error: "Document not found." }, { status: 404 }); }
}
