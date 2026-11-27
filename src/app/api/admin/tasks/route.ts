import { NextResponse } from "next/server";
import { ID, Permission, Query, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security";

const schema = z.object({
  internshipId: z.string().min(1).max(64),
  title: z.string().trim().max(180).optional().default(""),
  instructions: z.string().trim().max(12000).optional().default(""),
  sequence: z.union([z.literal(""), z.coerce.number().int().min(1).max(500)]).optional().default(""),
  dueAt: z.union([z.iso.datetime(), z.literal("")]).optional().default(""),
  maxScore: z.union([z.literal(""), z.coerce.number().int().min(0).max(10000)]).optional().default(""),
  assignmentMode: z.enum(["all_enrolled", "selected_students"]).optional().default("all_enrolled"),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  if ((await checkRateLimit(request, "admin-task-create", 30)).limited) return NextResponse.json({ error: "Too many task changes. Try again shortly." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const form = await request.formData();
  const input = schema.safeParse({
    internshipId: form.get("internshipId"),
    title: form.get("title") ?? "",
    instructions: form.get("instructions") ?? "",
    sequence: form.get("sequence") ?? "",
    dueAt: form.get("dueAt") ?? "",
    maxScore: form.get("maxScore") ?? "",
    assignmentMode: form.get("assignmentMode") || "all_enrolled",
  });
  const isMandatory = form.get("isMandatory") !== "off";
  const isPublished = form.get("isPublished") !== "off";
  const assignedStudentIds = [...new Set(form.getAll("assignedStudentIds").filter((value): value is string => typeof value === "string" && value.length <= 64))];
  const file = form.get("resource");
  const resource = file instanceof File && file.size > 0 ? file : null;
  if (!input.success) return NextResponse.json({ error: "Invalid task upload request." }, { status: 400 });
  if (!resource && input.data.instructions.length < 10) {
    return NextResponse.json({ error: "Please select a Task PDF to upload." }, { status: 400 });
  }
  if (input.data.assignmentMode === "selected_students" && !assignedStudentIds.length) return NextResponse.json({ error: "Select at least one active student or assign the task to all enrollees." }, { status: 400 });
  if (assignedStudentIds.length > 100) return NextResponse.json({ error: "Select no more than 100 students per task batch." }, { status: 400 });
  let resourceBytes: Buffer | null = null;
  if (resource) {
    if (resource.type !== "application/pdf" || resource.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Task resources must be PDF files up to 25 MB." }, { status: 400 });
    resourceBytes = Buffer.from(await resource.arrayBuffer());
    if (!resourceBytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) return NextResponse.json({ error: "The uploaded task resource is not a valid PDF." }, { status: 400 });
  }

  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Task service is not configured." }, { status: 503 });
  const taskTable = resources.tables.tasks;
  const internshipsTable = resources.tables.internships;
  const enrollmentsTable = resources.tables.enrollments;
  const assignmentsTable = resources.tables.taskAssignments;
  const resourcesTable = resources.tables.taskResources;
  const bucketId = resources.buckets.submissionsBucket;

  let taskId = "";
  let resourceFileId = "";
  let resourceVersionRowId = "";
  const createdAssignmentIds: string[] = [];
  try {
    const internshipRow = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipsTable, rowId: input.data.internshipId }) as Record<string, unknown>;
    const existingTasks = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: taskTable, queries: [Query.equal("internshipId", input.data.internshipId), Query.orderDesc("sequence"), Query.limit(100)] });
    const maxSequence = existingTasks.rows.reduce((max, row) => Math.max(max, Number((row as Record<string, unknown>).sequence ?? 0)), 0);
    const resolvedSequence = input.data.sequence === "" ? maxSequence + 1 : input.data.sequence;
    if (input.data.sequence !== "" && existingTasks.rows.some((row) => Number((row as Record<string, unknown>).sequence) === resolvedSequence)) {
      return NextResponse.json({ error: "That sequence number is already used for this internship." }, { status: 409 });
    }

    let assignees: string[] = [];
    if (input.data.assignmentMode === "selected_students") {
      const active = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.equal("internshipId", input.data.internshipId), Query.equal("studentId", assignedStudentIds), Query.equal("status", "active"), Query.limit(100)] });
      assignees = [...new Set(active.rows.map((row) => String(row.studentId)))];
      if (assignees.length !== assignedStudentIds.length) return NextResponse.json({ error: "Every selected student must have an active enrollment in this internship." }, { status: 400 });
    } else {
      const active = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.equal("internshipId", input.data.internshipId), Query.equal("status", "active"), Query.limit(100)] });
      assignees = [...new Set(active.rows.map((row) => String(row.studentId)))];
    }

    taskId = ID.unique();
    if (resource && resourceBytes && bucketId) {
      const uploaded = await new Storage(service.client).createFile({ bucketId, fileId: ID.unique(), file: InputFile.fromBuffer(resourceBytes, `task-resource-${taskId}.pdf`), permissions: [Permission.read(Role.user(admin.$id))] });
      resourceFileId = uploaded.$id;
    }

    const derivedTitle =
      input.data.title ||
      `${String(internshipRow.title ?? "Internship").trim()} Task Brief`.slice(0, 180);
    const storedInstructions =
      input.data.instructions ||
      "Open the attached Task PDF below to view all tasks, instructions, and requirements.";

    await service.tablesDB.createRow({ databaseId: service.databaseId, tableId: taskTable, rowId: taskId, data: {
      internshipId: input.data.internshipId, title: derivedTitle, instructions: storedInstructions, sequence: resolvedSequence, isMandatory, dueAt: input.data.dueAt || null, maxScore: input.data.maxScore === "" ? null : input.data.maxScore, isPublished, assignmentMode: input.data.assignmentMode, resourceFileId: resourceFileId || null, resourceFileName: resource ? resource.name.slice(0, 255) : null, resourceVersion: resourceFileId ? 1 : null,
    } });

    if (resourceFileId && resource && resourcesTable) {
      resourceVersionRowId = ID.unique();
      await service.tablesDB.createRow({ databaseId: service.databaseId, tableId: resourcesTable, rowId: resourceVersionRowId, data: { taskId, version: 1, resourceFileId, resourceFileName: resource.name.slice(0, 255), uploadedBy: admin.$id, uploadedAt: new Date().toISOString() } });
    }

    for (const studentId of input.data.assignmentMode === "selected_students" ? assignees : []) {
      const row = await service.tablesDB.createRow({ databaseId: service.databaseId, tableId: assignmentsTable!, rowId: ID.unique(), data: { taskId, studentId, assignedBy: admin.$id, assignedAt: new Date().toISOString() }, permissions: [Permission.read(Role.user(studentId))] });
      createdAssignmentIds.push(row.$id);
    }
    return NextResponse.json({ id: taskId, assignedCount: assignees.length, resourceAttached: Boolean(resourceFileId) }, { status: 201 });
  } catch (error) {
    for (const assignmentId of createdAssignmentIds) try { await service.tablesDB.deleteRow({ databaseId: service.databaseId, tableId: assignmentsTable!, rowId: assignmentId }); } catch { /* best-effort cleanup of rows created by this request */ }
    if (resourceVersionRowId && resourcesTable) try { await service.tablesDB.deleteRow({ databaseId: service.databaseId, tableId: resourcesTable, rowId: resourceVersionRowId }); } catch { /* best-effort cleanup */ }
    if (taskId) try { await service.tablesDB.deleteRow({ databaseId: service.databaseId, tableId: taskTable, rowId: taskId }); } catch { /* best-effort cleanup of row created by this request */ }
    if (resourceFileId && bucketId) try { await new Storage(service.client).deleteFile({ bucketId, fileId: resourceFileId }); } catch { /* best-effort cleanup of private upload */ }
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return NextResponse.json({ error: code === 401 ? "Appwrite API key is missing a task, row, bucket, or file scope." : "Could not save this task. Check Appwrite task and storage scopes." }, { status: code === 401 ? 503 : 500 });
  }
}
