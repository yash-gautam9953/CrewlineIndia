import { NextResponse } from "next/server";
import { Account } from "node-appwrite";
import { z } from "zod";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { sessionCookieName } from "@/lib/appwrite/session";
import { ensureStudentProfile } from "@/lib/student-profile";
import { isAdminIdentity } from "@/lib/authz";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({ email: z.email().trim().toLowerCase(), password: z.string().min(1).max(128) });

export async function POST(request: Request) {
  if (isRateLimited(request, "auth-login", 10)) return NextResponse.json({ error: "Too many sign-in attempts. Please wait a minute and try again." }, { status: 429 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  if (!service) return NextResponse.json({ error: "Appwrite authentication is not configured." }, { status: 503 });

  try {
    const account = new Account(service.client);
    const session = await account.createEmailPasswordSession(input.data);
    const sessionClient = (await import("@/lib/appwrite/session")).createSessionClient(session.secret);
    const user = await sessionClient.account.get();
    await ensureStudentProfile(user);
    const response = NextResponse.json({ redirectTo: user.emailVerification && isAdminIdentity(user.$id) ? "/admin" : "/account" });
    response.cookies.set(sessionCookieName(), session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(session.expire),
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Email or password is incorrect, or the Appwrite session could not be created." }, { status: 401 });
  }
}
