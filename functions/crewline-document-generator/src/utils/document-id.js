import { randomInt } from "node:crypto";

export const DOCUMENT_TYPE_CODES = {
  offer: "O",
  internship_completion: "I",
  project_completion: "P",
};

/**
 * Generates a compact, collision-resistant Crewline document identifier.
 * Examples: CW-26O-7K9M2, CW-26I-7K9M2, CW-26P-7K9M2
 * @param {"offer" | "internship_completion" | "project_completion"} type
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function generateDocumentId(type, date = new Date()) {
  const code = DOCUMENT_TYPE_CODES[type];
  if (!code) {
    throw new Error(`Unsupported document type: ${type}`);
  }
  const year = String(date.getUTCFullYear()).slice(-2);
  const suffix = randomInt(0, 36 ** 5).toString(36).toUpperCase().padStart(5, "0");
  return `CW-${year}${code}-${suffix}`;
}

/**
 * Validates both current compact CW-YYT-XXXXX IDs and legacy CW-TYPE-YYYY-XXXXXX IDs.
 * @param {string} documentId
 * @returns {boolean}
 */
export function isValidDocumentId(documentId) {
  if (typeof documentId !== "string") return false;
  const trimmed = documentId.trim();
  return (
    /^CW-\d{2}[OIP]-[A-Z0-9]{5}$/.test(trimmed) ||
    /^CW-(OFFER|INT|PROJ)-\d{4}-[A-Z0-9]{6}$/.test(trimmed)
  );
}
