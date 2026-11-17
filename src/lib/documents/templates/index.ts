import "server-only";
import QRCode from "qrcode";
import type { DocumentSnapshot } from "../document-validation";
import { renderInternshipCertificate } from "./internship-certificate";
import { renderOfferLetter } from "./offer-letter";
import { renderProjectCertificate } from "./project-certificate";
import type { DocumentAssets } from "./shared";

export async function renderDocumentHtml(snapshot: DocumentSnapshot, assets: DocumentAssets) {
  if (snapshot.documentType === "offer") return renderOfferLetter(snapshot, assets);
  const qr = await QRCode.toDataURL(snapshot.verificationUrl, { errorCorrectionLevel: "M", margin: 1, width: 190, color: { dark: "#123B70", light: "#FFFFFF" } });
  return snapshot.documentType === "internship_completion"
    ? renderInternshipCertificate(snapshot, assets, qr)
    : renderProjectCertificate(snapshot, assets, qr);
}
