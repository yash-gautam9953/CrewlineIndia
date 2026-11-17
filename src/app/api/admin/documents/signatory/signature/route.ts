import { NextResponse } from "next/server";
import { Query, Storage } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const service = createPrivilegedAppwriteClient();
  const bucketId = process.env.APPWRITE_DOCUMENTS_BUCKET_ID;
  const tableId = process.env.APPWRITE_WEBSITE_CONTENT_TABLE_ID;
  if (!service || !bucketId || !tableId) return NextResponse.json({ error: "Signatory storage is not configured." }, { status: 503 });
  try {
    const rows = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("contentKey", "authorized-signatory"), Query.limit(1)] });
    const content = rows.rows[0]?.content;
    if (typeof content !== "string") return NextResponse.json({ error: "No signature is configured." }, { status: 404 });
    const settings = JSON.parse(content) as { signatureFileId?: string };
    if (!settings.signatureFileId) return NextResponse.json({ error: "No signature is configured." }, { status: 404 });
    const bytes = await new Storage(service.client).getFileDownload({ bucketId, fileId: settings.signatureFileId });
    return new NextResponse(bytes, { headers: { "content-type": "image/png", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Signature preview is unavailable." }, { status: 503 }); }
}
