import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { calculateInternshipDates, INTERNSHIP_DURATIONS } from "../src/lib/internship-dates";
import { generateDocumentId, getEventKey } from "../src/lib/documents/document-id-generator";
import { renderOfferLetter } from "../src/lib/documents/templates/offer-letter";
import type { DocumentSnapshot } from "../src/lib/documents/document-validation";
import { generatePdf } from "../src/lib/documents/pdf-generator";

async function loadTestAssets() {
  const font = async (family: "inter" | "poppins", file: string) =>
    `data:font/woff2;base64,${(await readFile(join(process.cwd(), "node_modules", "@fontsource", family, "files", file))).toString("base64")}`;

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

function makeOfferSnapshot(overrides: Partial<DocumentSnapshot> = {}): DocumentSnapshot {
  const documentId = generateDocumentId("offer", new Date("2026-11-20T00:00:00Z"));
  return {
    documentType: "offer",
    documentId,
    studentId: "student-user-123",
    studentName: "Priya Sharma",
    documentTitle: "Web Development Internship",
    domain: "Web Development",
    duration: "1 Month",
    startDate: "2026-11-20T00:00:00.000Z",
    endDate: "2026-12-20T00:00:00.000Z",
    completionDate: "",
    issueDate: "2026-11-20T00:00:00.000Z",
    workMode: "Virtual / Remote",
    stipend: "",
    terms: "",
    sourceId: "application-xyz-789",
    internshipId: "internship-web-dev",
    projectTitle: "",
    signatoryName: "Yash Gautam",
    signatoryDesignation: "Founder",
    signatorySignatureFileId: "sig-file-id",
    templateVersion: "1.0",
    verificationUrl: `https://crewline.me/verify/${documentId}`,
    reissuedFrom: "",
    reissueReason: "",
    ...overrides,
  };
}

// ----------------------------------------------------
// 1. Enrollment & Date Calculation Tests
// ----------------------------------------------------
test("enrollment date engine calculates start, end and submission deadline accurately", () => {
  const result = calculateInternshipDates("2026-11-20", "1 Month");
  assert.equal(result.startAt, "2026-11-20T00:00:00.000Z");
  assert.equal(result.endAt, "2026-12-20T00:00:00.000Z");
  assert.equal(result.submissionDeadlineAt, "2026-12-18T00:00:00.000Z");

  const diffDays = (new Date(result.endAt).getTime() - new Date(result.submissionDeadlineAt).getTime()) / 86_400_000;
  assert.equal(diffDays, 2, "Submission deadline must be exactly 2 calendar days before the internship end date.");
});

test("enrollment date calculation handles multi-month durations", () => {
  const twoMonths = calculateInternshipDates("2026-11-20", "2 Months");
  assert.equal(twoMonths.endAt, "2027-01-20T00:00:00.000Z");
  assert.equal(twoMonths.submissionDeadlineAt, "2027-01-18T00:00:00.000Z");

  const threeMonths = calculateInternshipDates("2026-11-20", "3 Months");
  assert.equal(threeMonths.endAt, "2027-02-20T00:00:00.000Z");
  assert.equal(threeMonths.submissionDeadlineAt, "2027-02-18T00:00:00.000Z");
});

test("enrollment rejects invalid calendar dates and unsupported durations", () => {
  assert.throws(() => calculateInternshipDates("2026-02-31", "1 Month"), /valid internship start date/);
  assert.throws(() => calculateInternshipDates("not-a-date", "1 Month"), /valid internship start date/);
  assert.throws(() => calculateInternshipDates("2026-11-20", "6 Months" as unknown as typeof INTERNSHIP_DURATIONS[number]), /supported internship duration/);
});

// ----------------------------------------------------
// 2. Offer Letter Generation & Variable Mapping Tests
// ----------------------------------------------------
test("offer letter template correctly populates all dynamic tokens without any unresolved placeholders", async () => {
  const assets = await loadTestAssets();
  const snapshot = makeOfferSnapshot({
    studentName: "Aditya &lt;Dev&gt; Patel",
    documentTitle: "Full-Stack Web Development",
    domain: "Web & Cloud Engineering",
    duration: "2 Months",
    startDate: "2026-12-01T00:00:00.000Z",
    endDate: "2027-02-01T00:00:00.000Z",
    workMode: "Virtual / Remote",
  });

  const html = renderOfferLetter(snapshot, assets);

  // Must not have any unresolved double-brace variables
  const unescapedMatches = html.match(/\{\{.*?\}\}/g);
  assert.equal(unescapedMatches, null, `Template has unresolved tokens: ${unescapedMatches}`);

  // Must contain populated student details
  assert.match(html, /Aditya &amp;lt;Dev&amp;gt; Patel|Aditya &lt;Dev&gt; Patel/);
  assert.match(html, /Full-Stack Web Development/);
  assert.match(html, /Web &amp; Cloud Engineering/);
  assert.match(html, /2 Months/);
  assert.match(html, /Yash Gautam/);
  assert.match(html, /Founder/);
  assert.match(html, new RegExp(snapshot.documentId));
});

test("offer letter compiles to a valid A4 portrait PDF buffer via Playwright", async () => {
  const assets = await loadTestAssets();
  const snapshot = makeOfferSnapshot();
  const html = renderOfferLetter(snapshot, assets);

  const pdfBuffer = await generatePdf(html, false);
  assert.ok(pdfBuffer instanceof Uint8Array);
  assert.ok(pdfBuffer.length > 5000, "PDF buffer must be non-empty and well-formed.");

  // Check PDF magic header
  const header = Buffer.from(pdfBuffer.slice(0, 5)).toString("utf8");
  assert.equal(header, "%PDF-");
});

test("document event key provides strict idempotency for enrollment offer letters", () => {
  const event1 = getEventKey("offer", "application-12345");
  const event2 = getEventKey("offer", "application-12345");
  assert.equal(event1, event2, "Event key must be strictly identical for the same application.");
  assert.equal(event1, "offer:application-12345");

  const diffApp = getEventKey("offer", "application-99999");
  assert.notEqual(event1, diffApp, "Different applications must have distinct event keys.");
});
