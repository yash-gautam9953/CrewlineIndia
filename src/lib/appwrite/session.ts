import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { Account, Client } from "node-appwrite";
import { resolveAppwriteEndpoint, resolveAppwriteProjectId } from "./project";

export function sessionCookieName() {
  const projectId = resolveAppwriteProjectId();
  if (!projectId) throw new Error("NEXT_PUBLIC_APPWRITE_PROJECT_ID is not configured.");
  return `a_session_${projectId}`;
}

export function createSessionClient(secret: string) {
  const endpoint = resolveAppwriteEndpoint();
  const projectId = resolveAppwriteProjectId();
  if (!endpoint || !projectId) throw new Error("Appwrite endpoint or project ID is not configured.");
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setSession(secret);
  return { client, account: new Account(client) };
}

export const getSessionUser = cache(async () => {
  const endpoint = resolveAppwriteEndpoint();
  const projectId = resolveAppwriteProjectId();
  if (!projectId || !endpoint) return null;
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(sessionCookieName())?.value;
  if (!sessionSecret) return null;
  try {
    const { account } = createSessionClient(sessionSecret);
    const user = await account.get();
    return { user, sessionSecret };
  } catch {
    return null;
  }
});
