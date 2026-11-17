import "server-only";
import { randomInt } from "node:crypto";

const formats = { offer: "CW-OFFER", internship_completion: "CW-INT", project_completion: "CW-PROJ" } as const;
export type DocumentType = keyof typeof formats;

export function generateDocumentId(type: DocumentType, date = new Date()) {
  const suffix = randomInt(0, 36 ** 6).toString(36).toUpperCase().padStart(6, "0");
  return `${formats[type]}-${date.getUTCFullYear()}-${suffix}`;
}

export function getEventKey(type: DocumentType, sourceId: string, reissueFromId = "") {
  return reissueFromId ? `${type}:${sourceId}:reissue:${reissueFromId}` : `${type}:${sourceId}`;
}
