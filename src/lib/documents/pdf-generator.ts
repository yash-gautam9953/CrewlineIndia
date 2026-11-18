import "server-only";
import { chromium } from "playwright";

export async function generatePdf(html: string, landscape: boolean) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle", timeout: 20000 });
    await page.evaluate(async () => { await document.fonts.ready; });
    return await page.pdf({ format: "A4", landscape, printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" }, displayHeaderFooter: false });
  } finally {
    await browser.close();
  }
}
