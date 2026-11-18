import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { Client, Storage } from "node-appwrite";

function readEnv() {
  const source = readFileSync(".env.local", "utf8");
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

const env = readEnv();
const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);
const storage = new Storage(client);

async function loadRealAssets() {
  const logoBytes = readFileSync(join(process.cwd(), "public", "brand-logo.png"));
  const signatureBytes = await storage.getFileDownload({
    bucketId: env.APPWRITE_DOCUMENTS_BUCKET_ID,
    fileId: "6afcbc54003bff116e55",
  });
  const font = (family, file) => `data:font/woff2;base64,${readFileSync(join(process.cwd(), "node_modules", "@fontsource", family, "files", file)).toString("base64")}`;

  return {
    logo: `data:image/png;base64,${logoBytes.toString("base64")}`,
    signature: `data:image/png;base64,${Buffer.from(signatureBytes).toString("base64")}`,
    fonts: {
      interRegular: font("inter", "inter-latin-400-normal.woff2"),
      interBold: font("inter", "inter-latin-700-normal.woff2"),
      poppinsSemiBold: font("poppins", "poppins-latin-600-normal.woff2"),
      poppinsBold: font("poppins", "poppins-latin-700-normal.woff2"),
    },
  };
}

// Dynamically import offer letter template compiled with tsx
const { renderOfferLetter } = await import("../src/lib/documents/templates/offer-letter.ts");

async function main() {
  console.log("Loading real Appwrite assets...");
  const assets = await loadRealAssets();
  console.log("Assets loaded. Logo:", assets.logo.length, "bytes, Signature:", assets.signature.length, "bytes");

  const testCases = [
    {
      name: "Standard",
      filePrefix: "offer_letter_standard",
      snapshot: {
        documentType: "offer",
        documentId: "CW-OFFER-2026-A1B2C3",
        studentId: "student-aarav-sharma",
        studentName: "Aarav Sharma",
        documentTitle: "Web Development Internship",
        domain: "Web Development",
        duration: "1 Month",
        startDate: "2026-11-20T00:00:00.000Z",
        endDate: "2026-12-20T00:00:00.000Z",
        completionDate: "",
        issueDate: "2026-11-19T00:00:00.000Z",
        workMode: "Virtual / Remote",
        stipend: "",
        terms: "",
        sourceId: "app-test-1",
        internshipId: "int-web-dev",
        projectTitle: "",
        signatoryName: "Yash Gautam",
        signatoryDesignation: "Founder",
        signatorySignatureFileId: "6afcbc54003bff116e55",
        templateVersion: "1.0",
        verificationUrl: "https://crewline.me/verify/CW-OFFER-2026-A1B2C3",
        reissuedFrom: "",
        reissueReason: "",
      },
    },
    {
      name: "Stress Long Text",
      filePrefix: "offer_letter_stress",
      snapshot: {
        documentType: "offer",
        documentId: "CW-OFFER-2026-X9Y8Z7",
        studentId: "student-alex-montgomery",
        studentName: "Dr. Alexander Christopher Montgomery-Featherstonehaugh Jr.",
        documentTitle: "Artificial Intelligence and Machine Learning Research Associate",
        domain: "Artificial Intelligence & Advanced Machine Learning",
        duration: "3 Months",
        startDate: "2026-12-01T00:00:00.000Z",
        endDate: "2027-03-01T00:00:00.000Z",
        completionDate: "",
        issueDate: "2026-11-19T00:00:00.000Z",
        workMode: "Virtual / Remote",
        stipend: "Performance-linked stipend",
        terms: "",
        sourceId: "app-test-2",
        internshipId: "int-ai-ml",
        projectTitle: "",
        signatoryName: "Yash Gautam",
        signatoryDesignation: "Founder",
        signatorySignatureFileId: "6afcbc54003bff116e55",
        templateVersion: "1.0",
        verificationUrl: "https://crewline.me/verify/CW-OFFER-2026-X9Y8Z7",
        reissuedFrom: "",
        reissueReason: "",
      },
    },
  ];

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  for (const tc of testCases) {
    console.log(`\nTesting case: ${tc.name}...`);
    const html = renderOfferLetter(tc.snapshot, assets);

    // 1. Check for unresolved tokens
    const unescapedTokens = html.match(/\{\{.*?\}\}/g);
    if (unescapedTokens) {
      console.error(`ERROR: Found unresolved template tokens in ${tc.name}:`, unescapedTokens);
      process.exit(1);
    } else {
      console.log(`✓ No unresolved template variables.`);
    }

    // 2. Playwright render & screenshot
    const page = await browser.newPage({ viewport: { width: 1280, height: 1800 }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(async () => { await document.fonts.ready; });

    const pageElement = await page.$(".page");
    const boundingBox = await pageElement.boundingBox();
    console.log(`✓ Rendered .page box: width=${boundingBox.width.toFixed(1)}px, height=${boundingBox.height.toFixed(1)}px`);

    const pngPath = `${tc.filePrefix}.png`;
    await pageElement.screenshot({ path: pngPath });
    console.log(`✓ Saved screenshot: ${pngPath}`);

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      displayHeaderFooter: false,
    });
    const pdfPath = `${tc.filePrefix}.pdf`;
    writeFileSync(pdfPath, pdfBuffer);
    console.log(`✓ Saved PDF: ${pdfPath} (${pdfBuffer.length} bytes)`);

    await page.close();
  }

  await browser.close();
  console.log("\nAll Offer Letter visual verifications completed successfully!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
