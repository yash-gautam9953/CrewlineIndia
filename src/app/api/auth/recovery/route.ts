import { NextResponse } from "next/server";
import { Account, Client } from "node-appwrite";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({ email: z.email().trim().toLowerCase() });

export async function POST(request: Request) {
  if (isRateLimited(request, "auth-recovery", 5)) return NextResponse.json({ error: "Too many recovery requests. Please wait a minute and try again." }, { status: 429 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!endpoint || !projectId || !appUrl) return NextResponse.json({ error: "Password recovery is not configured." }, { status: 503 });
  try {
    const account = new Account(new Client().setEndpoint(endpoint).setProject(projectId));
    await account.createRecovery({ email: input.data.email, url: `${appUrl.replace(/\/$/, "")}/reset-password` });
  } catch {
    // Return the same response whether the address exists or not.
  }
  return NextResponse.json({ message: "If the email is registered, Appwrite will send a recovery link." });
}
