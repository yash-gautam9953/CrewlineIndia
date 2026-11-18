import { chromium } from "playwright";

/**
 * Shared PDF Generation Service using Playwright Chromium.
 * Renders pixel-perfect A4 documents with zero margins and full background print support.
 * Guaranteed resource cleanup in finally blocks.
 */
export async function generatePdfFromHtml(html, options = {}) {
  const { landscape = false } = options;

  if (!html || typeof html !== "string") {
    throw new Error("HTML content is required to generate a PDF.");
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  });

  try {
    const page = await browser.newPage({
      viewport: landscape ? { width: 1400, height: 950 } : { width: 1000, height: 1400 },
      deviceScaleFactor: 2,
    });

    await page.setContent(html, {
      waitUntil: "networkidle",
      timeout: 25000,
    });

    // Ensure all web fonts are fully loaded before capturing PDF
    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      displayHeaderFooter: false,
    });

    // Validate generated PDF buffer
    if (!pdfBuffer || pdfBuffer.length < 1000) {
      throw new Error("Generated PDF buffer is empty or corrupted.");
    }

    const header = pdfBuffer.subarray(0, 5).toString("utf-8");
    if (!header.startsWith("%PDF-")) {
      throw new Error("Generated file does not have a valid %PDF header.");
    }

    return pdfBuffer;
  } finally {
    await browser.close().catch(() => {});
  }
}
