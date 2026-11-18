import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { isRateLimited } from "@/lib/rate-limit";
import { prepareDocument } from "@/lib/documents/document-validation";
import { getDocumentAssets, storeIssuedDocument } from "@/lib/documents/document-service";
import { renderDocumentHtml } from "@/lib/documents/templates";
import { verifyPreview } from "@/lib/documents/preview-token";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

const schema = z.object({ token: z.string().min(20).max(12000) });
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isRateLimited(request, "document-issue", 10)) return NextResponse.json({ error: "Too many issuance requests. Try again later." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  const claims = input.success ? verifyPreview(input.data.token) : null;
  if (!claims) return NextResponse.json({ error: "The preview expired or is invalid. Generate a fresh preview before issuing." }, { status: 400 });
  try {
    const options = { offerDetails: claims.snapshot.documentType === "offer" ? { startDate: claims.snapshot.startDate.slice(0, 10), duration: claims.snapshot.duration, workMode: claims.snapshot.workMode, stipend: claims.snapshot.stipend, terms: claims.snapshot.terms } : undefined, reissueFromId: claims.snapshot.reissuedFrom || undefined, reissueReason: claims.snapshot.reissueReason || undefined };
    if (claims.snapshot.reissuedFrom) {
      const config = createPrivilegedAppwriteClient();
      const docsTable = process.env.APPWRITE_DOCUMENTS_TABLE_ID;
      if (!config || !docsTable) throw new Error("Document storage is not configured.");
      const prior = await config.tablesDB.getRow({ databaseId: config.databaseId, tableId: docsTable, rowId: claims.snapshot.reissuedFrom }) as Record<string, unknown>;
      if (prior.documentType !== claims.snapshot.documentType || prior.sourceId !== claims.snapshot.sourceId) throw new Error("The source document changed after preview.");
      if (claims.snapshot.documentType !== "offer" && prior.status !== "revoked") throw new Error("Revoke the previous certificate before issuing the correction.");
    }
    const latest = await prepareDocument(claims.snapshot.documentType, claims.snapshot.sourceId, claims.snapshot.documentId, options);
    latest.issueDate = claims.snapshot.issueDate;
    if (latest.documentType === "offer") latest.completionDate = claims.snapshot.completionDate;
    if (JSON.stringify(latest) !== JSON.stringify(claims.snapshot)) return NextResponse.json({ error: "The source information or signatory settings changed after preview. Review a new preview before issuing." }, { status: 409 });
    const assets = await getDocumentAssets(latest.signatorySignatureFileId);
    const html = await renderDocumentHtml(latest, assets);
    const row = await storeIssuedDocument(latest, html, admin.$id);
    return NextResponse.json({ issued: true, documentId: row.$id }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const appwriteCode = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    const message = error instanceof Error ? error.message : "Document could not be issued.";
    return NextResponse.json({ error: message }, { status: appwriteCode === 409 ? 409 : 400, headers: { "cache-control": "no-store" } });
  }
}
