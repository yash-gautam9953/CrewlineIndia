import { NextResponse } from "next/server";
import { Storage } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ submissionId: string; fileId: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to access project files." }, { status: 401 });
  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Private project storage is not configured." }, { status: 503 });
  const tableId = resources.tables.submissions;
  const bucketId = resources.buckets.submissionsBucket;
  const { submissionId, fileId } = await params;
  try {
    const row = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId, rowId: submissionId }) as Record<string, unknown>;
    const isAdmin = Boolean(await getAdminUser());
    if (row.studentId !== session.user.$id && !isAdmin) return NextResponse.json({ error: "Project file not found." }, { status: 404 });
    const fileIds = typeof row.fileIds === "string" ? row.fileIds.split(",").filter(Boolean) : [];
    if (!fileIds.includes(fileId)) return NextResponse.json({ error: "Project file not found." }, { status: 404 });
    const storage = new Storage(service.client);
    const [metadata, bytes] = await Promise.all([storage.getFile({ bucketId, fileId }), storage.getFileDownload({ bucketId, fileId })]);
    const safeName = metadata.name.replace(/[\r\n"\\/]/g, "_");
    return new NextResponse(bytes, { headers: { "content-type": metadata.mimeType || "application/octet-stream", "content-disposition": `attachment; filename="${safeName}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox" } });
  } catch { return NextResponse.json({ error: "Project file not found." }, { status: 404 }); }
}
