import "server-only";
import { chromium } from "playwright";

export async function generatePdf(html: string, landscape: boolean) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle", timeout: 20000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => undefined)));
      const missing = Array.from(document.querySelectorAll<HTMLImageElement>("img[data-pdf-required-image]"))
        .filter((image) => image.naturalWidth === 0)
        .map((image) => image.dataset.pdfRequiredImage || image.alt || "Required image");
      if (missing.length) throw new Error(`PDF image failed to load: ${missing.join(", ")}`);
    });
    return await page.pdf({ format: "A4", landscape, printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" }, displayHeaderFooter: false });
  } finally {
    await browser.close();
  }
}
