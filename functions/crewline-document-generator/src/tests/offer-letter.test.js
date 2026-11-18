import test from "node:test";
import assert from "node:assert/strict";
import { renderDocumentTemplate } from "../utils/template-renderer.js";
import { generatePdfFromHtml } from "../services/pdf-service.js";

test("Offer Letter: Renders valid HTML with all tokens and inlined assets", async () => {
  const sampleData = {
    documentId: "CW-OFFER-2026-TEST01",
    issueDate: "2026-11-19T00:00:00.000Z",
    studentName: "Aarav Sharma",
    documentTitle: "Full Stack Web Development Intern",
    domain: "Web Development",
    duration: "1 Month",
    startDate: "2026-11-20T00:00:00.000Z",
    endDate: "2026-12-20T00:00:00.000Z",
    workMode: "Remote",
    signatoryName: "Yash Gautam",
    signatoryDesignation: "Founder",
  };

  const html = await renderDocumentTemplate({
    documentType: "offer",
    data: sampleData,
  });

  // Check token substitutions
  assert.ok(html.includes("CW-OFFER-2026-TEST01"), "Offer ID must be present");
  assert.ok(html.includes("Aarav Sharma"), "Student name must be present");
  assert.ok(html.includes("Full Stack Web Development Intern"), "Internship role must be present");
  assert.ok(html.includes("Web Development"), "Domain must be present");
  assert.ok(html.includes("data:image/png;base64,"), "Assets must be inlined as Data URLs");

  // Ensure no unrendered tokens exist
  const unrendered = html.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
  assert.equal(unrendered, null, "There should be zero unresolved {{...}} tokens");
});

test("Offer Letter: Escapes malicious inputs safely", async () => {
  const maliciousData = {
    documentId: "CW-OFFER-2026-XSS001",
    issueDate: "2026-11-19T00:00:00.000Z",
    studentName: "<script>alert('xss')</script>John & Jane Doe",
    documentTitle: "Frontend <b>Engineer</b>",
    domain: "Tech & Innovation",
    duration: "1 Month",
    startDate: "2026-11-20T00:00:00.000Z",
    endDate: "2026-12-20T00:00:00.000Z",
    workMode: "Remote",
    signatoryName: "Yash Gautam",
    signatoryDesignation: "Founder",
  };

  const html = await renderDocumentTemplate({
    documentType: "offer",
    data: maliciousData,
  });

  assert.ok(!html.includes("<script>"), "Raw script tag must NOT be present in HTML");
  assert.ok(html.includes("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"), "Malicious script must be escaped");
  assert.ok(html.includes("John &amp; Jane Doe"), "Ampersand must be escaped");
});

test("Offer Letter: Generates valid A4 portrait PDF buffer via Playwright", async () => {
  const sampleData = {
    documentId: "CW-OFFER-2026-PDF001",
    issueDate: "2026-11-19T00:00:00.000Z",
    studentName: "Priya Patel",
    documentTitle: "UI/UX Design Intern",
    domain: "Design",
    duration: "2 Months",
    startDate: "2026-11-20T00:00:00.000Z",
    endDate: "2027-01-20T00:00:00.000Z",
    workMode: "Remote",
    signatoryName: "Yash Gautam",
    signatoryDesignation: "Founder",
  };

  const html = await renderDocumentTemplate({
    documentType: "offer",
    data: sampleData,
  });

  const pdf = await generatePdfFromHtml(html, { landscape: false });
  assert.ok(Buffer.isBuffer(pdf), "Output must be a Buffer");
  assert.ok(pdf.length > 5000, "PDF buffer must be non-trivial in size");
  assert.equal(pdf.subarray(0, 5).toString("utf-8"), "%PDF-", "Buffer must begin with valid PDF magic bytes");
});
