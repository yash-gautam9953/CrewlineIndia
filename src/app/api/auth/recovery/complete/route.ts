import { NextResponse } from "next/server";
import { Account, Client } from "node-appwrite";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { resolveAppwriteEndpoint, resolveAppwriteProjectId } from "@/lib/appwrite/project";

const schema = z.object({ userId: z.string().min(1).max(64), secret: z.string().min(1).max(512), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  if (isRateLimited(request, "auth-recovery-complete", 5)) return NextResponse.json({ error: "Too many password changes. Please wait a minute and try again." }, { status: 429 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "The recovery link is invalid or expired." }, { status: 400 });
  const endpoint = resolveAppwriteEndpoint();
  const projectId = resolveAppwriteProjectId();
  if (!endpoint || !projectId) return NextResponse.json({ error: "Password recovery is not configured." }, { status: 503 });
  try {
    const account = new Account(new Client().setEndpoint(endpoint).setProject(projectId));
    await account.updateRecovery({ userId: input.data.userId, secret: input.data.secret, password: input.data.password });
    return NextResponse.json({ redirectTo: "/login?recovered=1" });
  } catch {
    return NextResponse.json({ error: "The recovery link is invalid or expired. Request a new one." }, { status: 400 });
  }
}
