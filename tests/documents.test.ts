import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateDocumentId, getEventKey, type DocumentType } from "../src/lib/documents/document-id-generator";
import type { DocumentSnapshot } from "../src/lib/documents/document-validation";
import { renderDocumentHtml } from "../src/lib/documents/templates";
import { generatePdf } from "../src/lib/documents/pdf-generator";

const types: DocumentType[] = ["offer", "internship_completion", "project_completion"];
async function loadAssets() {
  const font = async (family: "inter" | "poppins", file: string) => `data:font/woff2;base64,${(await readFile(join(process.cwd(), "node_modules", "@fontsource", family, "files", file))).toString("base64")}`;
  return {
    logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/jXcAAAAASUVORK5CYII=",
    signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/jXcAAAAASUVORK5CYII=",
    fonts: {
      interRegular: await font("inter", "inter-latin-400-normal.woff2"),
      interBold: await font("inter", "inter-latin-700-normal.woff2"),
      poppinsSemiBold: await font("poppins", "poppins-latin-600-normal.woff2"),
      poppinsBold: await font("poppins", "poppins-latin-700-normal.woff2"),
    },
  };
}

function snapshot(documentType: DocumentType): DocumentSnapshot {
  const documentId = generateDocumentId(documentType, new Date("2026-11-18T00:00:00Z"));
  return {
    documentType, documentId, studentId: "synthetic-user", studentName: "Asha <Test> Student", documentTitle: "Web Development Internship", domain: "Web Development", duration: "8 weeks", startDate: "2026-09-01T00:00:00.000Z", endDate: "2026-10-27T00:00:00.000Z", completionDate: "2026-10-27T00:00:00.000Z", issueDate: "2026-11-18T00:00:00.000Z", workMode: "Virtual / Remote", stipend: "", terms: "Synthetic test terms", sourceId: "synthetic-source", internshipId: "synthetic-internship", projectTitle: "Accessible Portfolio", signatoryName: "Authorized Signatory", signatoryDesignation: "Program Director", signatorySignatureFileId: "synthetic-signature-file", templateVersion: "1.0", verificationUrl: `https://crewline.me/verify/${documentId}`, reissuedFrom: "", reissueReason: "",
  };
}

test("document IDs follow the correct type-specific format and have six secure suffix characters", () => {
  const patterns: Record<DocumentType, RegExp> = {
    offer: /^CW-OFFER-2026-[A-Z0-9]{6}$/,
    internship_completion: /^CW-INT-2026-[A-Z0-9]{6}$/,
    project_completion: /^CW-PROJ-2026-[A-Z0-9]{6}$/,
  };
  for (const type of types) assert.match(generateDocumentId(type, new Date("2026-11-18T00:00:00Z")), patterns[type]);
});

test("an issuance event key is stable, while an explicitly linked reissue gets its own unique event key", () => {
  const original = getEventKey("internship_completion", "synthetic-enrollment");
  assert.equal(original, getEventKey("internship_completion", "synthetic-enrollment"));
  assert.notEqual(original, getEventKey("internship_completion", "synthetic-enrollment", "CW-INT-2026-ABC123"));
});

for (const type of types) {
  test(`${type} renders a print-ready HTML page and PDF with synthetic data`, async () => {
    const input = snapshot(type);
    const html = await renderDocumentHtml(input, await loadAssets());
    assert.match(html, /CREWLINE/);
    assert.match(html, /Authorized Signatory/);
    assert.match(html, /Asha &lt;Test&gt; Student/);
    assert.match(html, /data:image\/png;base64/);
    if (type === "offer") assert.match(html, /INTERNSHIP OFFER LETTER/);
    else {
      assert.match(html, /data:image\/png;base64/);
      assert.match(html, new RegExp(input.documentId));
      assert.match(html, /\/verify\//);
    }
    const pdf = await generatePdf(html, type !== "offer");
    assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
    assert.ok(pdf.byteLength > 10_000, "PDF should contain rendered page content");
    const pdfText = pdf.toString("latin1");
    const mediaBox = pdfText.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
    assert.ok(mediaBox, "PDF should declare a page size");
    const width = Number(mediaBox?.[3]) - Number(mediaBox?.[1]);
    const height = Number(mediaBox?.[4]) - Number(mediaBox?.[2]);
    assert.equal(width > height, type !== "offer", "offer must be portrait; completion certificates must be landscape");
  });
}
