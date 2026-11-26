import "server-only";
import { resolveAppwriteEndpoint, resolveAppwriteProjectId } from "./project";

export function getAppwriteBaseConfig() {
  return {
    endpoint: resolveAppwriteEndpoint(),
    projectId: resolveAppwriteProjectId(),
    databaseId: process.env.APPWRITE_DATABASE_ID?.trim() || null,
  };
}

export function hasPublicInternshipConfig() {
  const cfg = getAppwriteBaseConfig();
  return Boolean(cfg.endpoint && cfg.projectId && cfg.databaseId && process.env.APPWRITE_API_KEY?.trim());
}
