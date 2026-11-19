import { NextResponse } from "next/server";
import { Account, ID, Users } from "node-appwrite";
import { z } from "zod";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { sessionCookieName } from "@/lib/appwrite/session";
import { ensureStudentProfile } from "@/lib/student-profile";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

type AppwriteFailure = { code?: unknown; type?: unknown; message?: unknown };

function failureDetails(error: unknown) {
  const failure = (typeof error === "object" && error !== null ? error : {}) as AppwriteFailure;
  const message = error instanceof Error ? error.message : typeof failure.message === "string" ? failure.message : undefined;
  return {
    code: typeof failure.code === "number" ? failure.code : undefined,
    type: typeof failure.type === "string" ? failure.type : undefined,
    message,
  };
}

function registrationError(error: unknown, stage: "create-user" | "profile" | "session") {
  const { code, type, message } = failureDetails(error);
  console.error("[auth/register] Appwrite operation failed", { stage, code, type, error: message });

  if (code === 409 || type?.includes("user_already_exists") || message?.toLowerCase().includes("already exists")) {
    return NextResponse.json({ error: "This email is already registered. Sign in instead." }, { status: 409 });
  }

  if (type === "general_unauthorized_scope") {
    const scope = stage === "create-user" ? "users.write" : stage === "profile" ? "rows.read and rows.write" : "sessions.write";
    return NextResponse.json({ error: `Appwrite API key is missing the ${scope} scope. Add it to APPWRITE_API_KEY in .env.local, then restart the dev server.` }, { status: 503 });
  }

  if (code === 429 || type?.includes("rate_limit") || message?.toLowerCase().includes("rate limit")) {
    return NextResponse.json({ error: "Appwrite rate limit reached for account creation. Please wait a moment and try again." }, { status: 429 });
  }

  if (stage !== "create-user") {
    return NextResponse.json({ error: "Your account was created, but sign-in setup did not finish. Try signing in; if that fails, check the Appwrite scopes in .env.local." }, { status: 502 });
  }

  const devDetail = message ? `: ${message}` : type ? ` (${type}${code ? `, HTTP ${code}` : ""})` : "";
  const errorMessage = process.env.NODE_ENV === "development" && devDetail
    ? `Appwrite rejected account creation${devDetail}. Check the project configuration and users.write scope.`
    : "Account creation failed. Check the Appwrite configuration, or try signing in if you already registered.";
  return NextResponse.json({ error: errorMessage }, { status: code === 400 ? 400 : 502 });
}

export async function POST(request: Request) {
  if (isRateLimited(request, "auth-register", 5)) return NextResponse.json({ error: "Too many signup attempts. Please wait a minute and try again." }, { status: 429 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Name, valid email, and password (at least 8 characters) are required." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  if (!service) return NextResponse.json({ error: "Appwrite authentication is not configured." }, { status: 503 });

  let user;
  try {
    user = await new Users(service.client).create({ userId: ID.unique(), email: input.data.email, password: input.data.password, name: input.data.fullName });
  } catch (error) {
    return registrationError(error, "create-user");
  }

  try {
    await ensureStudentProfile(user);
  } catch (error) {
    return registrationError(error, "profile");
  }

  let session;
  try {
    session = await new Account(service.client).createEmailPasswordSession({ email: input.data.email, password: input.data.password });
  } catch (error) {
    return registrationError(error, "session");
  }

  const response = NextResponse.json({ redirectTo: "/account" }, { status: 201 });
  response.cookies.set(sessionCookieName(), session.secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(session.expire),
    path: "/",
  });
  return response;
}
