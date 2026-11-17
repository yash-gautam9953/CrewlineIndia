import "server-only";
import { getSessionUser } from "@/lib/appwrite/session";

export async function getAdminUser() {
  const session = await getSessionUser();
  if (!session || !session.user.emailVerification) return null;
  return isAdminIdentity(session.user.$id) ? session.user : null;
}

export function isAdminIdentity(userId: string) {
  const allowlist = (process.env.CREWLINE_ADMIN_IDENTITIES ?? "")
    .split(",")
    .map((identity) => identity.trim())
    .filter(Boolean);
  return allowlist.includes(userId);
}
