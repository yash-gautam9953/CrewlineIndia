import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DocumentSnapshot } from "../document-validation";
import { dateText, safeText, type DocumentAssets } from "./shared";

const templatePath = join(process.cwd(), "Crewline-Offer-Letter", "crewline-internship-offer-letter.html");

export async function renderOfferLetter(snapshot: DocumentSnapshot, assets: DocumentAssets, options: { preview?: boolean } = {}) {
  if (!assets.offerLetterBackground) {
    throw new Error("Offer letter background is missing. Add offer-letter-background.png to the Crewline-Offer-Letter folder before previewing or issuing offers.");
  }

  const template = await readFile(templatePath, "utf8");
  const values: Record<string, string> = {
    offer_id: snapshot.documentId,
    issue_date: dateText(snapshot.issueDate),
    student_name: snapshot.studentName,
    // studentId is the existing Appwrite auth user ID stored in document snapshots.
    student_id: snapshot.studentId,
    internship_role: snapshot.documentTitle,
    internship_domain: snapshot.domain,
    duration: snapshot.duration,
    start_date: dateText(snapshot.startDate),
    end_date: dateText(snapshot.endDate),
    work_mode: snapshot.workMode,
    signatory_name: snapshot.signatoryName,
    signatory_designation: snapshot.signatoryDesignation,
  };

  let html = template
    .replace('src="offer-letter-background.png"', `src="${assets.offerLetterBackground}"`)
    .replace('src="signature.png"', `src="${assets.signature}"`)
    .replace("{{preview_banner}}", options.preview ? '<div class="preview-banner">TEST PREVIEW · SAMPLE DATA · NOT FOR ISSUE</div>' : "");

  for (const [key, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${key}}}`, safeText(value));
  }
  return html;
}
