import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { DocumentSnapshot } from "./document-validation";

type Claims = { snapshot: DocumentSnapshot; createdAt: number };
function secret() {
  const value = process.env.CREWLINE_PREVIEW_SECRET?.trim();
  if (!value || value.length < 16) {
    throw new Error("CREWLINE_PREVIEW_SECRET is not configured (minimum 16 characters required).");
  }
  return createHmac("sha256", value).update("crewline-document-preview-v1").digest();
}
function signature(data: string) { return createHmac("sha256", secret()).update(data).digest("base64url"); }

export function signPreview(claims: Claims) {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyPreview(token: string): Claims | null {
  try {
    const [payload, supplied, ...extra] = token.split(".");
    if (!payload || !supplied || extra.length) return null;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(supplied);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Claims;
    if (Date.now() - claims.createdAt > 15 * 60 * 1000 || claims.createdAt > Date.now() + 30_000) return null;
    return claims;
  } catch { return null; }
}
