import "server-only";
import { invokeDocumentFunction, isDocumentFunctionConfigured } from "./function-client";

export async function generatePdf(html: string, landscape: boolean) {
  if (isDocumentFunctionConfigured()) {
    const result = await invokeDocumentFunction<{ pdfBase64: string }>({
      action: "render_pdf",
      html,
      landscape,
    });
    if (!result.pdfBase64) {
      throw new Error("Appwrite document function did not return PDF bytes.");
    }
    return Buffer.from(result.pdfBase64, "base64");
  }

  // Require Appwrite Document Function in production; never bundle or invoke local Playwright on Vercel
  if (process.env.NODE_ENV === "production") {
    throw new Error("APPWRITE_DOCUMENT_FUNCTION_ID is required for PDF generation in production.");
  }

  const playwrightPkg = "playwright";
  const { chromium } = (await import(/* webpackIgnore: true */ playwrightPkg)) as typeof import("playwright");

  const wsEndpoint =
    process.env.CHROME_WS_ENDPOINT ||
    (process.env.BROWSERLESS_API_KEY
      ? `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`
      : null);

  const browser = wsEndpoint
    ? await chromium.connectOverCDP(wsEndpoint)
    : await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle", timeout: 20000 });
    await page.evaluate(async () => { await document.fonts.ready; });
    return await page.pdf({ format: "A4", landscape, printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" }, displayHeaderFooter: false });
  } finally {
    await browser.close();
  }
}
