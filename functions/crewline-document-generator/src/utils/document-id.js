import { randomInt } from "node:crypto";

export const DOCUMENT_TYPE_PREFIXES = {
  offer: "CW-OFFER",
  internship_completion: "CW-INT",
  project_completion: "CW-PROJ",
};

/**
 * Generates a unique, collision-resistant document identifier.
 * Example: CW-INT-2026-AB12CD
 * @param {"offer" | "internship_completion" | "project_completion"} type
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function generateDocumentId(type, date = new Date()) {
  const prefix = DOCUMENT_TYPE_PREFIXES[type];
  if (!prefix) {
    throw new Error(`Unsupported document type: ${type}`);
  }
  const year = date.getUTCFullYear();
  const suffix = randomInt(0, 36 ** 6).toString(36).toUpperCase().padStart(6, "0");
  return `${prefix}-${year}-${suffix}`;
}

/**
 * Validates whether a document ID adheres to the canonical Crewline schema.
 * @param {string} documentId
 * @returns {boolean}
 */
export function isValidDocumentId(documentId) {
  if (typeof documentId !== "string") return false;
  return /^CW-(OFFER|INT|PROJ)-\d{4}-[A-Z0-9]{6}$/.test(documentId.trim());
}
