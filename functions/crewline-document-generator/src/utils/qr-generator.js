import QRCode from "qrcode";

/**
 * Generates high-contrast Data URL QR code for certificate verification.
 * @param {string} url
 * @param {object} [options={}]
 * @returns {Promise<string>}
 */
export async function generateQrCodeDataUrl(url, options = {}) {
  if (!url || typeof url !== "string") {
    throw new Error("A valid URL string is required to generate a QR code.");
  }

  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: options.width || 240,
    color: {
      dark: options.darkColor || "#123B70",
      light: options.lightColor || "#FFFFFF",
    },
  });
}
