import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { isRateLimited } from "@/lib/rate-limit";
import { generateDocumentId, type DocumentType } from "@/lib/documents/document-id-generator";
import { prepareDocument } from "@/lib/documents/document-validation";
import { getDocumentAssets } from "@/lib/documents/document-service";
import { renderDocumentHtml } from "@/lib/documents/templates";
import { signPreview } from "@/lib/documents/preview-token";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { generatePdf } from "@/lib/documents/pdf-generator";

const schema = z.object({ documentType: z.enum(["offer", "internship_completion", "project_completion"]), sourceId: z.string().min(1).max(64), startDate: z.iso.date().optional(), duration: z.string().trim().max(80).optional(), workMode: z.enum(["Virtual / Remote", "Hybrid", "On-site"]).optional(), stipend: z.string().trim().max(120).optional().default(""), terms: z.string().trim().max(1200).optional().default(""), reissueFromId: z.string().min(1).max(40).optional(), reissueReason: z.string().trim().min(10).max(2000).optional() }).refine((value) => Boolean(value.reissueFromId) === Boolean(value.reissueReason), "A controlled reissue requires both the previous document ID and a reason.");

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isRateLimited(request, "document-preview", 20)) return NextResponse.json({ error: "Too many preview requests. Please wait before trying again." }, { status: 429 });
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choose a document source and provide all required offer details." }, { status: 400 });
  try {
    const documentId = generateDocumentId(input.data.documentType as DocumentType);
    const config = createPrivilegedAppwriteClient();
    const resources = config ? await getAppwriteResources().catch(() => null) : null;
    if (!config || !resources) throw new Error("Document storage is not configured.");
    const docsTable = resources.tables.documents;
    if (input.data.reissueFromId) {
      const prior = await config.tablesDB.getRow({ databaseId: config.databaseId, tableId: docsTable, rowId: input.data.reissueFromId }) as Record<string, unknown>;
      if (prior.documentType !== input.data.documentType || prior.sourceId !== input.data.sourceId) throw new Error("The previous document does not match this student and source record.");
      if (input.data.documentType !== "offer" && prior.status !== "revoked") throw new Error("Revoke a completion certificate before issuing a correction.");
    }
    const offerDetails = input.data.documentType === "offer" ? {
      startDate: input.data.startDate ?? "",
      duration: input.data.duration ?? "",
      workMode: input.data.workMode ?? "Virtual / Remote",
      stipend: input.data.stipend,
      terms: input.data.terms,
    } : undefined;
    const snapshot = await prepareDocument(input.data.documentType, input.data.sourceId, documentId, { offerDetails, reissueFromId: input.data.reissueFromId, reissueReason: input.data.reissueReason });
    const assets = await getDocumentAssets();
    const html = await renderDocumentHtml(snapshot, assets);
    const pdf = await generatePdf(html, snapshot.documentType !== "offer");
    const token = signPreview({ snapshot, createdAt: Date.now() });
    return NextResponse.json({ documentId, previewPdf: Buffer.from(pdf).toString("base64"), token }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document preview could not be prepared.";
    return NextResponse.json({ error: message }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
