import "server-only";
import { randomInt } from "node:crypto";

const formats = { offer: "O", internship_completion: "I", project_completion: "P" } as const;
export type DocumentType = keyof typeof formats;

export function generateDocumentId(type: DocumentType, date = new Date()) {
  const year = String(date.getUTCFullYear()).slice(-2);
  const suffix = randomInt(0, 36 ** 5).toString(36).toUpperCase().padStart(5, "0");
  return `CW-${year}${formats[type]}-${suffix}`;
}

export function getEventKey(type: DocumentType, sourceId: string, reissueFromId = "") {
  return reissueFromId ? `${type}:${sourceId}:reissue:${reissueFromId}` : `${type}:${sourceId}`;
}
