import { NextResponse } from "next/server";
import { ID, Permission, Query, Role } from "node-appwrite";
import { z } from "zod";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";

const httpsUrl = z.union([z.literal(""), z.url({ protocol: /^https$/ }).max(2048)]);
const schema = z.object({ taskId: z.string().min(1).max(64), repositoryUrl: httpsUrl.optional().default(""), liveUrl: httpsUrl.optional().default(""), explanation: z.string().trim().max(4000).optional().default("") }).refine((value) => value.repositoryUrl || value.liveUrl || value.explanation.length >= 20, "Add a project link or an explanation of your work.");

export async function POST(request: Request) {
  if (isRateLimited(request, "task-submit", 15)) return NextResponse.json({ error: "Too many submissions. Wait a minute and try again." }, { status: 429 });
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please sign in to submit your work." }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Add at least one project link or a short explanation of your work." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const tasksTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const enrollmentTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const submissionsTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  if (!service || !tasksTable || !enrollmentTable || !submissionsTable) return NextResponse.json({ error: "Submission service is not configured." }, { status: 503 });
  try {
    const task = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: tasksTable, rowId: input.data.taskId });
    if (!task.isPublished) return NextResponse.json({ error: "This task is not open for submissions." }, { status: 404 });
    const enrollments = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentTable, queries: [Query.equal("studentId", session.user.$id), Query.equal("internshipId", task.internshipId), Query.equal("status", "active"), Query.limit(1)] });
    const enrollment = enrollments.rows[0];
    if (!enrollment) return NextResponse.json({ error: "An active enrollment is required to submit this task." }, { status: 403 });
    const versions = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.equal("studentId", session.user.$id), Query.equal("taskId", input.data.taskId), Query.orderDesc("version"), Query.limit(1)] });
    const previous = versions.rows[0] as (typeof versions.rows)[number] & Record<string, unknown> | undefined;
    if (previous && !["revision_required"].includes(String(previous.status))) return NextResponse.json({ error: "This task already has a submission under review or approved. Wait for mentor feedback before submitting again." }, { status: 409 });
    const row = await service.tablesDB.createRow({ databaseId: service.databaseId, tableId: submissionsTable, rowId: ID.unique(), data: { studentId: session.user.$id, enrollmentId: enrollment.$id, taskId: input.data.taskId, version: Number(previous?.version ?? 0) + 1, repositoryUrl: input.data.repositoryUrl, liveUrl: input.data.liveUrl, explanation: input.data.explanation, fileIds: "", status: "submitted", submittedAt: new Date().toISOString() }, permissions: [Permission.read(Role.user(session.user.$id))] });
    return NextResponse.json({ id: row.$id }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not save your submission." }, { status: 500 }); }
}
