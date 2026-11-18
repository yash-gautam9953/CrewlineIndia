import test from "node:test";
import assert from "node:assert/strict";
import { renderDocumentTemplate } from "../utils/template-renderer.js";
import { generateQrCodeDataUrl } from "../utils/qr-generator.js";
import { generatePdfFromHtml } from "../services/pdf-service.js";

test("Internship Certificate: Renders valid HTML with all tokens, QR, badge, and assets", async () => {
  const verificationUrl = "https://crewline.me/verify/CW-INT-2026-TEST01";
  const qrDataUrl = await generateQrCodeDataUrl(verificationUrl);

  const sampleData = {
    documentId: "CW-INT-2026-TEST01",
    issueDate: "2026-11-19T00:00:00.000Z",
    studentName: "Aditya Verma",
    documentTitle: "Backend Engineering",
    domain: "Software Development",
    duration: "1 Month",
    startDate: "2026-10-15T00:00:00.000Z",
    endDate: "2026-11-15T00:00:00.000Z",
    workMode: "Remote",
    verificationUrl,
    signatoryName: "Yash Gautam",
    signatoryDesignation: "Founder",
  };

  const html = await renderDocumentTemplate({
    documentType: "internship_completion",
    data: sampleData,
    qrCodeDataUrl: qrDataUrl,
  });

  // Verify tokens
  assert.ok(html.includes("CW-INT-2026-TEST01"), "Certificate ID must be present");
  assert.ok(html.includes("Aditya Verma"), "Student name must be present");
  assert.ok(html.includes("Backend Engineering"), "Role must be present");
  assert.ok(html.includes("Software Development"), "Domain must be present");
  assert.ok(html.includes(verificationUrl), "Verification URL must be present");
  assert.ok(html.includes("data:image/png;base64,"), "Images must be inlined");

  // Verify visual elements from precision design
  assert.ok(html.includes("laurel"), "Laurel wreath SVG must be present");
  assert.ok(html.includes("stroke=\"#4256ff\""), "Notched border SVG must be present");
  assert.ok(!html.includes("transform: translateX(-7mm)"), "Offset bug must not be present");

  // Ensure zero unresolved tokens
  const unrendered = html.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
  assert.equal(unrendered, null, "There should be zero unresolved {{...}} tokens");
});

test("Internship Certificate: Generates valid A4 landscape PDF buffer via Playwright", async () => {
  const verificationUrl = "https://crewline.me/verify/CW-INT-2026-PDF001";
  const qrDataUrl = await generateQrCodeDataUrl(verificationUrl);

  const sampleData = {
    documentId: "CW-INT-2026-PDF001",
    issueDate: "2026-11-19T00:00:00.000Z",
    studentName: "Ananya Deshmukh",
    documentTitle: "Data Science Intern",
    domain: "Artificial Intelligence",
    duration: "2 Months",
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2026-11-01T00:00:00.000Z",
    workMode: "Remote",
    verificationUrl,
    signatoryName: "Yash Gautam",
    signatoryDesignation: "Founder",
  };

  const html = await renderDocumentTemplate({
    documentType: "internship_completion",
    data: sampleData,
    qrCodeDataUrl: qrDataUrl,
  });

  const pdf = await generatePdfFromHtml(html, { landscape: true });
  assert.ok(Buffer.isBuffer(pdf), "Output must be a Buffer");
  assert.ok(pdf.length > 5000, "PDF buffer must be non-trivial in size");
  assert.equal(pdf.subarray(0, 5).toString("utf-8"), "%PDF-", "Buffer must begin with valid PDF magic bytes");
});
