import { NextResponse } from "next/server";
import { Storage } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { studentCanAccessTask } from "@/lib/task-access";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to open this resource." }, { status: 401 });
  const service = createPrivilegedAppwriteClient();
  const taskTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const bucketId = process.env.APPWRITE_SUBMISSIONS_BUCKET_ID;
  if (!service || !taskTable || !bucketId) return NextResponse.json({ error: "Task resource storage is not configured." }, { status: 503 });
  const { taskId } = await params;
  try {
    const task = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: taskTable, rowId: taskId }) as Record<string, unknown>;
    const admin = await getAdminUser();
    if (!admin && (!task.isPublished || !await studentCanAccessTask(service.tablesDB, service.databaseId, { ...task, $id: taskId }, session.user.$id))) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    if (typeof task.resourceFileId !== "string" || !task.resourceFileId) return NextResponse.json({ error: "This task has no attached resource." }, { status: 404 });
    const bytes = await new Storage(service.client).getFileDownload({ bucketId, fileId: task.resourceFileId });
    const filename = typeof task.resourceFileName === "string" ? task.resourceFileName.replace(/[\r\n"\\/]/g, "_") : "task-resource.pdf";
    return new NextResponse(bytes, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Resource not found." }, { status: 404 }); }
}
