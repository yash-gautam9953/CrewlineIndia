import test from "node:test";
import assert from "node:assert/strict";
import { renderDocumentTemplate } from "../utils/template-renderer.js";
import { generateQrCodeDataUrl } from "../utils/qr-generator.js";
import { generatePdfFromHtml } from "../services/pdf-service.js";

test("Project Certificate: Renders valid HTML with all tokens, QR, badge, and assets", async () => {
  const verificationUrl = "https://crewline.me/verify/CW-PROJ-2026-TEST01";
  const qrDataUrl = await generateQrCodeDataUrl(verificationUrl);

  const sampleData = {
    documentId: "CW-PROJ-2026-TEST01",
    issueDate: "2026-11-19T00:00:00.000Z",
    studentName: "Rohan Iyer",
    projectTitle: "Automated Microservice Workflow Pipeline",
    documentTitle: "Cloud Architecture Intern",
    domain: "Cloud Computing",
    verificationUrl,
    signatoryName: "Yash Gautam",
    signatoryDesignation: "Founder",
  };

  const html = await renderDocumentTemplate({
    documentType: "project_completion",
    data: sampleData,
    qrCodeDataUrl: qrDataUrl,
  });

  // Verify tokens
  assert.ok(html.includes("CW-PROJ-2026-TEST01"), "Certificate ID must be present");
  assert.ok(html.includes("Rohan Iyer"), "Student name must be present");
  assert.ok(html.includes("Automated Microservice Workflow Pipeline"), "Project title must be present");
  assert.ok(html.includes("Cloud Architecture Intern"), "Role must be present");
  assert.ok(html.includes("Cloud Computing"), "Domain must be present");
  assert.ok(html.includes(verificationUrl), "Verification URL must be present");

  // Ensure zero unresolved tokens
  const unrendered = html.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
  assert.equal(unrendered, null, "There should be zero unresolved {{...}} tokens");
});

test("Project Certificate: Generates valid A4 landscape PDF buffer via Playwright", async () => {
  const verificationUrl = "https://crewline.me/verify/CW-PROJ-2026-PDF001";
  const qrDataUrl = await generateQrCodeDataUrl(verificationUrl);

  const sampleData = {
    documentId: "CW-PROJ-2026-PDF001",
    issueDate: "2026-11-19T00:00:00.000Z",
    studentName: "Sneha Sen",
    projectTitle: "Decentralized Auth & Document Verification Portal",
    documentTitle: "Full Stack Development",
    domain: "Web Development",
    verificationUrl,
    signatoryName: "Yash Gautam",
    signatoryDesignation: "Founder",
  };

  const html = await renderDocumentTemplate({
    documentType: "project_completion",
    data: sampleData,
    qrCodeDataUrl: qrDataUrl,
  });

  const pdf = await generatePdfFromHtml(html, { landscape: true });
  assert.ok(Buffer.isBuffer(pdf), "Output must be a Buffer");
  assert.ok(pdf.length > 5000, "PDF buffer must be non-trivial in size");
  assert.equal(pdf.subarray(0, 5).toString("utf-8"), "%PDF-", "Buffer must begin with valid PDF magic bytes");
});
