import "server-only";
import type { DocumentSnapshot } from "../document-validation";

export type DocumentAssets = {
  logo: string;
  signature: string;
  badge?: string;
  fonts: {
    interRegular: string;
    interBold: string;
    poppinsSemiBold: string;
    poppinsBold: string;
  };
};
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export const safeText = (value: string) => escapeHtml(value || "—");
export const dateText = (value: string) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }) : "—";

export function brandHeader(snapshot: DocumentSnapshot, assets: DocumentAssets) {
  return `<header class="brand"><img class="logo" src="${assets.logo}" alt="Crewline"/><div><strong>CREWLINE</strong><span>Learn. Build. Get Recognized.</span></div><div class="doc-id">${safeText(snapshot.documentId)}<small>Issued ${dateText(snapshot.issueDate)}</small></div></header>`;
}

export function signatureBlock(snapshot: DocumentSnapshot, assets: DocumentAssets) {
  return `<div class="signature"><img src="${assets.signature}" alt="Authorized signature"/><span class="rule"></span><strong>${safeText(snapshot.signatoryName)}</strong><span>${safeText(snapshot.signatoryDesignation)}</span><small>For CREWLINE</small></div>`;
}

export function verificationBlock(snapshot: DocumentSnapshot, qrDataUrl: string) {
  return `<div class="verification"><img src="${qrDataUrl}" alt="Certificate verification QR code"/><span>Verify this certificate<br/>${safeText(snapshot.verificationUrl)}</span></div>`;
}

const sharedCss = `@font-face{font-family:Inter;src:url(%INTER400%) format('woff2');font-style:normal;font-weight:400;font-display:block}@font-face{font-family:Inter;src:url(%INTER700%) format('woff2');font-style:normal;font-weight:700;font-display:block}@font-face{font-family:Poppins;src:url(%POPPINS600%) format('woff2');font-style:normal;font-weight:600;font-display:block}@font-face{font-family:Poppins;src:url(%POPPINS700%) format('woff2');font-style:normal;font-weight:700;font-display:block}*{box-sizing:border-box}html,body{margin:0;padding:0;color:#172033;font-family:Inter,Arial,sans-serif}body{background:#fff}.brand{display:flex;align-items:center;gap:12px;border-bottom:2px solid #DCE6F2;padding:0 0 18px}.logo{width:62px;height:54px;object-fit:contain}.brand strong{display:block;color:#123B70;font:700 18px Poppins,Arial,sans-serif;letter-spacing:.14em}.brand span{display:block;margin-top:4px;color:#64748B;font-size:9px}.doc-id{margin-left:auto;text-align:right;color:#123B70;font-size:10px;font-weight:700}.doc-id small{display:block;margin-top:5px;color:#64748B;font-size:9px;font-weight:400}.eyebrow{color:#1769D2;font-size:10px;font-weight:700;letter-spacing:.2em}.signature{display:flex;flex-direction:column;align-items:flex-start;width:220px;margin-top:30px;color:#172033;font-size:10px}.signature img{max-width:170px;max-height:58px;object-fit:contain;object-position:left bottom;margin-bottom:4px}.signature .rule{display:block;width:100%;border-top:1px solid #123B70;margin:0 0 8px}.signature strong{font-size:11px}.signature span{margin-top:3px;color:#64748B}.signature small{margin-top:4px;color:#123B70;font-weight:700;letter-spacing:.1em}`;

export function documentHtml(orientation: "portrait" | "landscape", heading: string, content: string, assets: DocumentAssets) {
  const fonts = sharedCss.replace("%INTER400%", assets.fonts.interRegular).replace("%INTER700%", assets.fonts.interBold).replace("%POPPINS600%", assets.fonts.poppinsSemiBold).replace("%POPPINS700%", assets.fonts.poppinsBold);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${heading}</title><style>@page{size:A4 ${orientation};margin:0}${fonts}</style></head><body>${content}</body></html>`;
}

export type { DocumentSnapshot };
