import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionClient, sessionCookieName } from "@/lib/appwrite/session";

export async function POST() {
  const cookieStore = await cookies();
  const secret = cookieStore.get(sessionCookieName())?.value;
  if (secret) {
    try {
      await createSessionClient(secret).account.deleteSession({ sessionId: "current" });
    } catch {
      // Clear the local cookie even when the remote session has expired.
    }
  }
  const response = NextResponse.json({ redirectTo: "/" });
  response.cookies.delete(sessionCookieName());
  return response;
}
