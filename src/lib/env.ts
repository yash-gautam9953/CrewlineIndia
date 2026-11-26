import "server-only";
import { resolveAppwriteEndpoint, resolveAppwriteProjectId } from "./appwrite/project";

export type EnvCheckResult = {
  ok: boolean;
  missing: string[];
  mismatchError?: string;
};

export const CORE_REQUIRED_ENV = [
  "NEXT_PUBLIC_APPWRITE_ENDPOINT",
  "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
  "NEXT_PUBLIC_APP_URL",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
  "CREWLINE_ADMIN_IDENTITIES",
  "CREWLINE_PREVIEW_SECRET",
] as const;

export const ENROLLMENT_REQUIRED_ENV = [
  "NEXT_PUBLIC_APPWRITE_ENDPOINT",
  "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
] as const;

export const DOCUMENT_REQUIRED_ENV = [
  "NEXT_PUBLIC_APPWRITE_ENDPOINT",
  "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
  "CREWLINE_PREVIEW_SECRET",
] as const;

export function checkRequiredEnv(keys: readonly string[], env: Record<string, string | undefined> = process.env): EnvCheckResult {
  const missing: string[] = [];
  let mismatchError: string | undefined;

  for (const key of keys) {
    if (key === "NEXT_PUBLIC_APPWRITE_PROJECT_ID") {
      try {
        if (!resolveAppwriteProjectId(env)) missing.push(key);
      } catch (err) {
        mismatchError = err instanceof Error ? err.message : "Project ID mismatch.";
      }
      continue;
    }
    if (key === "NEXT_PUBLIC_APPWRITE_ENDPOINT") {
      if (!resolveAppwriteEndpoint(env)) missing.push(key);
      continue;
    }
    if (!env[key]?.trim()) {
      missing.push(key);
    }
  }

  return { ok: missing.length === 0 && !mismatchError, missing, mismatchError };
}
