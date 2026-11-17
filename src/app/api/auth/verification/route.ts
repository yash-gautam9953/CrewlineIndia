import { NextResponse } from "next/server";
import { getSessionUser, createSessionClient } from "@/lib/appwrite/session";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (isRateLimited(request, "auth-verification", 3)) return NextResponse.json({ error: "Too many verification emails requested. Wait a minute and retry." }, { status: 429 });
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in before requesting email verification." }, { status: 401 });
  if (session.user.emailVerification) return NextResponse.json({ verified: true });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) return NextResponse.json({ error: "Email verification URL is not configured." }, { status: 503 });
  try {
    const { account } = createSessionClient(session.sessionSecret);
    await account.createVerification({ url: `${appUrl}/verify-email` });
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ error: "Appwrite could not send a verification email. Check the project email settings." }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  if (isRateLimited(request, "auth-verification-complete", 5)) return NextResponse.json({ error: "Too many verification attempts. Wait a minute and retry." }, { status: 429 });
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in on this browser before completing verification." }, { status: 401 });
  const body = await request.json().catch(() => null) as { userId?: unknown; secret?: unknown } | null;
  if (typeof body?.userId !== "string" || body.userId !== session.user.$id || typeof body.secret !== "string" || body.secret.length > 512) return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
  try {
    const { account } = createSessionClient(session.sessionSecret);
    await account.updateVerification({ userId: body.userId, secret: body.secret });
    return NextResponse.json({ verified: true });
  } catch { return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 }); }
}
