export function resolveAppwriteEndpoint(env: Record<string, string | undefined> = process.env): string | null {
  const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim();
  return endpoint || null;
}

/**
 * Consolidates project ID lookup using NEXT_PUBLIC_APPWRITE_PROJECT_ID as the primary source
 * while supporting legacy APPWRITE_PROJECT_ID during migration.
 * Fails closed (throws) if both are set and do not match.
 */
export function resolveAppwriteProjectId(env: Record<string, string | undefined> = process.env): string | null {
  const publicId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID?.trim() || "";
  const privateId = env.APPWRITE_PROJECT_ID?.trim() || "";

  if (publicId && privateId && publicId !== privateId) {
    throw new Error(
      "Appwrite configuration mismatch: NEXT_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_PROJECT_ID must refer to the same project."
    );
  }

  return publicId || privateId || null;
}
