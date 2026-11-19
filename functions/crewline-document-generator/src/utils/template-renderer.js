import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { safeText, dateText } from "./html-escape.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATE_DIRS = {
  offer: join(__dirname, "..", "templates", "offer-letter"),
  internship_completion: join(__dirname, "..", "templates", "internship-certificate"),
  project_completion: join(__dirname, "..", "templates", "project-certificate"),
};

// Cache template HTML and static assets in memory for fast performance
const templateCache = new Map();
const assetCache = new Map();

/**
 * Reads a local asset file and converts to base64 Data URL.
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
async function loadAssetAsDataUrl(filePath, mimeType = "image/png") {
  if (assetCache.has(filePath)) {
    return assetCache.get(filePath);
  }
  const buffer = await readFile(filePath);
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  assetCache.set(filePath, dataUrl);
  return dataUrl;
}

/**
 * Loads the raw HTML template string.
 * @param {"offer" | "internship_completion" | "project_completion"} type
 * @returns {Promise<string>}
 */
async function loadTemplateHtml(type) {
  const dir = TEMPLATE_DIRS[type];
  if (!dir) throw new Error(`Unknown template type: ${type}`);
  if (templateCache.has(type)) {
    return templateCache.get(type);
  }
  const htmlPath = join(dir, "template.html");
  const html = await readFile(htmlPath, "utf-8");
  templateCache.set(type, html);
  return html;
}

/**
 * Renders a document HTML string with all assets inlined as base64 Data URLs
 * and tokens strictly escaped and substituted.
 *
 * @param {object} params
 * @param {"offer" | "internship_completion" | "project_completion"} params.documentType
 * @param {object} params.data
 * @param {string} [params.signatureDataUrl] - Optional dynamic signature data URL
 * @param {string} [params.qrCodeDataUrl] - Data URL for verification QR
 * @returns {Promise<string>} Fully rendered HTML string
 */
export async function renderDocumentTemplate({
  documentType,
  data,
  qrCodeDataUrl = null,
}) {
  const templateDir = TEMPLATE_DIRS[documentType];
  if (!templateDir) {
    throw new Error(`Unsupported document type: ${documentType}`);
  }

  let html = await loadTemplateHtml(documentType);

  const assetsDir = join(templateDir, "assets");

  // Load and inline default assets from the assets/ directory
  const logoDataUrl = await loadAssetAsDataUrl(join(assetsDir, "brand-logo.png"), "image/png");
  const signDataUrl = await loadAssetAsDataUrl(join(assetsDir, "yash-sign.png"), "image/png");

  // Replace asset references in HTML with data URLs
  html = html.replace(/src="(?:assets\/)?brand-logo\.png"/g, `src="${logoDataUrl}"`);
  html = html.replace(/src="(?:assets\/)?yash-sign\.png"/g, `src="${signDataUrl}"`);

  if (documentType === "internship_completion" || documentType === "project_completion") {
    const badgeDataUrl = await loadAssetAsDataUrl(join(assetsDir, "crewline-badge-transparent.png"), "image/png");
    html = html.replace(/src="(?:assets\/)?crewline-badge-transparent\.png"/g, `src="${badgeDataUrl}"`);
  }

  // Token dictionary mapping
  const tokenMap = {};

  if (!data.signatoryName || !data.signatoryDesignation) {
    throw new Error("Authorized signatory details (signatory_name and signatory_designation) are missing.");
  }

  if (documentType === "offer") {
    tokenMap["{{offer_id}}"] = safeText(data.documentId || data.offerId);
    tokenMap["{{issue_date}}"] = dateText(data.issueDate);
    tokenMap["{{student_name}}"] = safeText(data.studentName);
    tokenMap["{{internship_role}}"] = safeText(data.documentTitle || data.internshipRole);
    tokenMap["{{internship_domain}}"] = safeText(data.domain || data.internshipDomain);
    tokenMap["{{duration}}"] = safeText(data.duration);
    tokenMap["{{start_date}}"] = dateText(data.startDate);
    tokenMap["{{end_date}}"] = dateText(data.endDate);
    tokenMap["{{work_mode}}"] = safeText(data.workMode || "Remote");
    tokenMap["{{signatory_name}}"] = safeText(data.signatoryName);
    tokenMap["{{signatory_designation}}"] = safeText(data.signatoryDesignation);
  } else if (documentType === "internship_completion") {
    tokenMap["{{certificate_id}}"] = safeText(data.documentId || data.certificateId);
    tokenMap["{{issue_date}}"] = dateText(data.issueDate);
    tokenMap["{{student_name}}"] = safeText(data.studentName);
    tokenMap["{{duration}}"] = safeText(data.duration);
    tokenMap["{{internship_role}}"] = safeText(data.documentTitle || data.internshipRole);
    tokenMap["{{internship_domain}}"] = safeText(data.domain || data.internshipDomain);
    tokenMap["{{start_date}}"] = dateText(data.startDate);
    tokenMap["{{end_date}}"] = dateText(data.endDate);
    tokenMap["{{work_mode}}"] = safeText(data.workMode || "Remote");
    tokenMap["{{qr_code_image}}"] = qrCodeDataUrl || "";
    tokenMap["{{verification_url}}"] = safeText(data.verificationUrl);
    tokenMap["{{signatory_name}}"] = safeText(data.signatoryName);
    tokenMap["{{signatory_designation}}"] = safeText(data.signatoryDesignation);
  } else if (documentType === "project_completion") {
    tokenMap["{{certificate_id}}"] = safeText(data.documentId || data.certificateId);
    tokenMap["{{issue_date}}"] = dateText(data.issueDate);
    tokenMap["{{student_name}}"] = safeText(data.studentName);
    tokenMap["{{project_title}}"] = safeText(data.projectTitle);
    tokenMap["{{internship_role}}"] = safeText(data.documentTitle || data.internshipRole);
    tokenMap["{{internship_domain}}"] = safeText(data.domain || data.internshipDomain);
    tokenMap["{{qr_code_image}}"] = qrCodeDataUrl || "";
    tokenMap["{{verification_url}}"] = safeText(data.verificationUrl);
    tokenMap["{{signatory_name}}"] = safeText(data.signatoryName);
    tokenMap["{{signatory_designation}}"] = safeText(data.signatoryDesignation);
  }

  // Substitute all tokens
  for (const [token, value] of Object.entries(tokenMap)) {
    html = html.replaceAll(token, value);
  }

  // Verification check: ensure no unresolved {{...}} tokens remain in actual rendered content
  const contentWithoutComments = html
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const remainingTokens = contentWithoutComments.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
  if (remainingTokens && remainingTokens.length > 0) {
    throw new Error(
      `Unresolved template tokens detected in ${documentType}: ${[...new Set(remainingTokens)].join(", ")}`
    );
  }

  return html;
}
