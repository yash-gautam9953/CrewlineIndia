import { NextResponse } from "next/server";
import { ID, Permission, Query, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";

const detailsSchema = z.object({ name: z.string().trim().min(2).max(160), designation: z.string().trim().min(2).max(160) });

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_WEBSITE_CONTENT_TABLE_ID;
  if (!service || !tableId) return NextResponse.json({ error: "Signatory storage is not configured." }, { status: 503 });
  try {
    const result = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("contentKey", "authorized-signatory"), Query.limit(1)] });
    const row = result.rows[0] as (typeof result.rows)[number] & Record<string, unknown> | undefined;
    if (!row || typeof row.content !== "string") return NextResponse.json({ configured: false });
    const settings = JSON.parse(row.content) as { name?: string; designation?: string; signatureFileId?: string };
    return NextResponse.json({ configured: Boolean(settings.name && settings.designation && settings.signatureFileId), name: settings.name ?? "", designation: settings.designation ?? "", signatureFileId: settings.signatureFileId ?? "" }, { headers: { "cache-control": "no-store" } });
  } catch { return NextResponse.json({ error: "Signatory settings are unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (isRateLimited(request, "signatory-settings", 5)) return NextResponse.json({ error: "Too many settings changes. Wait before trying again." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const form = await request.formData();
  const parsed = detailsSchema.safeParse({ name: form.get("name"), designation: form.get("designation") });
  const signature = form.get("signature");
  if (!parsed.success) return NextResponse.json({ error: "Enter a signatory name and designation." }, { status: 400 });
  if (!(signature instanceof File) || signature.size < 8 || signature.size > 2 * 1024 * 1024 || signature.type !== "image/png") return NextResponse.json({ error: "Upload a transparent PNG signature image up to 2 MB." }, { status: 400 });
  const bytes = Buffer.from(await signature.arrayBuffer());
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return NextResponse.json({ error: "The uploaded file is not a valid PNG image." }, { status: 400 });
  if (bytes.length < 24) return NextResponse.json({ error: "The PNG image is incomplete." }, { status: 400 });
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 4096 || height > 2048) return NextResponse.json({ error: "Signature image dimensions must be no larger than 4096 × 2048 pixels." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_WEBSITE_CONTENT_TABLE_ID;
  const bucketId = process.env.APPWRITE_DOCUMENTS_BUCKET_ID;
  if (!service || !tableId || !bucketId) return NextResponse.json({ error: "Document storage is not configured. Run the Appwrite setup script first." }, { status: 503 });
  try {
    const storage = new Storage(service.client);
    const uploaded = await storage.createFile({ bucketId, fileId: ID.unique(), file: InputFile.fromBuffer(bytes, `authorized-signature-${Date.now()}.png`), permissions: [Permission.read(Role.user(admin.$id))] });
    const existing = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("contentKey", "authorized-signatory"), Query.limit(1)] });
    const content = JSON.stringify({ name: parsed.data.name, designation: parsed.data.designation, signatureFileId: uploaded.$id, updatedAt: new Date().toISOString() });
    if (existing.rows[0]) {
      await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: existing.rows[0].$id, data: { content, contentType: "authorized-signatory", isPublished: false, updatedBy: admin.$id } });
    } else {
      await service.tablesDB.createRow({ databaseId: service.databaseId, tableId, rowId: ID.unique(), data: { contentKey: "authorized-signatory", contentType: "authorized-signatory", content, isPublished: false, updatedBy: admin.$id, publishedAt: null } });
    }
    return NextResponse.json({ saved: true, signatureFileId: uploaded.$id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save authorized signature settings. Check Appwrite Storage and table scopes." }, { status: 502 });
  }
}
