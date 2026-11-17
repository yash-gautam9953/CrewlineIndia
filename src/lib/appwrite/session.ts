import "server-only";
import { cookies } from "next/headers";
import { Account, Client } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;

export function sessionCookieName() {
  if (!projectId) throw new Error("APPWRITE_PROJECT_ID is not configured.");
  return `a_session_${projectId}`;
}

export function createSessionClient(secret: string) {
  if (!endpoint || !projectId) throw new Error("Appwrite endpoint or project ID is not configured.");
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setSession(secret);
  return { client, account: new Account(client) };
}

export async function getSessionUser() {
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
}
