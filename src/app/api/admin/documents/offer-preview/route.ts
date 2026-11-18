import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/authz";
import { getDocumentAssets } from "@/lib/documents/document-service";
import type { DocumentSnapshot } from "@/lib/documents/document-validation";
import { readSignatorySettings } from "@/lib/documents/document-validation";
import { renderOfferLetter } from "@/lib/documents/templates/offer-letter";

export const runtime = "nodejs";

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  try {
    const signatory = await readSignatorySettings();
    const assets = await getDocumentAssets(signatory.signatureFileId, true);
    const snapshot: DocumentSnapshot = {
      documentType: "offer",
      documentId: "CW-OFFER-2026-DEMO01",
      studentId: "STU-DEMO-0142",
      studentName: "Aarav Sharma",
      documentTitle: "Frontend Development Intern",
      domain: "Web Development",
      duration: "3 Months",
      startDate: "2026-12-01T00:00:00.000Z",
      endDate: "2027-02-28T00:00:00.000Z",
      completionDate: "2027-02-28T00:00:00.000Z",
      issueDate: new Date().toISOString(),
      workMode: "Virtual / Remote",
      stipend: "",
      terms: "",
      sourceId: "preview-only",
      internshipId: "preview-only",
      projectTitle: "",
      signatoryName: signatory.name,
      signatoryDesignation: signatory.designation,
      signatorySignatureFileId: signatory.signatureFileId,
      templateVersion: "preview",
      verificationUrl: "",
      reissuedFrom: "",
      reissueReason: "",
    };
    const html = await renderOfferLetter(snapshot, assets, { preview: true });
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offer letter preview could not be prepared.";
    return NextResponse.json({ error: message }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
