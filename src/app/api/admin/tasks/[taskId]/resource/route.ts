import { NextResponse } from "next/server";
import { ID, Permission, Query, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  if (isRateLimited(request, "task-resource-replace", 15)) return NextResponse.json({ error: "Too many task resource updates." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const form = await request.formData();
  const file = form.get("resource");
  if (!(file instanceof File) || file.size < 5 || file.size > 25 * 1024 * 1024 || file.type !== "application/pdf") return NextResponse.json({ error: "Choose a PDF file up to 25 MB." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") return NextResponse.json({ error: "The selected task resource is not a valid PDF." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const tasksTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const historyTable = process.env.APPWRITE_TASK_RESOURCES_TABLE_ID;
  const bucketId = process.env.APPWRITE_SUBMISSIONS_BUCKET_ID;
  const enrollmentsTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const assignmentsTable = process.env.APPWRITE_TASK_ASSIGNMENTS_TABLE_ID;
  if (!service || !tasksTable || !historyTable || !bucketId || !enrollmentsTable) return NextResponse.json({ error: "Task resource storage is not configured." }, { status: 503 });
  const { taskId } = await params;
  let fileId = "";
  let historyRowId = "";
  try {
    const task = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: tasksTable, rowId: taskId }) as Record<string, unknown>;
    const history = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: historyTable, queries: [Query.equal("taskId", taskId), Query.orderDesc("version"), Query.limit(1)] });
    const version = Math.max(Number(task.resourceVersion ?? 0), Number((history.rows[0] as Record<string, unknown> | undefined)?.version ?? 0)) + 1;
    const storage = new Storage(service.client);
    const uploaded = await storage.createFile({ bucketId, fileId: ID.unique(), file: InputFile.fromBuffer(bytes, `task-resource-${taskId}-v${version}.pdf`), permissions: [Permission.read(Role.user(admin.$id))] });
    fileId = uploaded.$id;
    historyRowId = ID.unique();
    await service.tablesDB.createRow({ databaseId: service.databaseId, tableId: historyTable, rowId: historyRowId, data: { taskId, version, resourceFileId: uploaded.$id, resourceFileName: file.name.slice(0, 255), uploadedBy: admin.$id, uploadedAt: new Date().toISOString() } });
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId: tasksTable, rowId: taskId, data: { resourceFileId: uploaded.$id, resourceFileName: file.name.slice(0, 255), resourceVersion: version } });
    if (task.isPublished) {
      let studentIds: string[] = [];
      if (task.assignmentMode === "selected_students" && assignmentsTable) {
        const assignments = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: assignmentsTable, queries: [Query.equal("taskId", taskId), Query.limit(100)] });
        studentIds = [...new Set(assignments.rows.map((row) => String(row.studentId)))];
      } else {
        const enrollments = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.equal("internshipId", String(task.internshipId)), Query.equal("status", "active"), Query.limit(100)] });
        studentIds = [...new Set(enrollments.rows.map((row) => String(row.studentId)))];
      }
      await Promise.all(studentIds.map((studentId) => createNotification({ userId: studentId, eventKey: `task-resource:${taskId}:v${version}:${studentId}`, title: "Task resource updated", body: `A new PDF resource version is available for “${String(task.title)}”.`, type: "task", targetUrl: "/account" }).catch(() => undefined)));
    }
    return NextResponse.json({ updated: true, version });
  } catch {
    if (historyRowId) try { await service.tablesDB.deleteRow({ databaseId: service.databaseId, tableId: historyTable, rowId: historyRowId }); } catch { /* best-effort rollback */ }
    if (fileId) try { await new Storage(service.client).deleteFile({ bucketId, fileId }); } catch { /* best-effort rollback */ }
    return NextResponse.json({ error: "Could not update this task resource." }, { status: 500 });
  }
}
