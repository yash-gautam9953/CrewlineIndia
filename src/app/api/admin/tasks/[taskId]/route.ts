import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security";
import { writeAuditLog } from "@/lib/documents/document-service";

const updateSchema = z.object({
  title: z.string().trim().min(3).max(180).optional(),
  instructions: z.string().trim().max(12000).optional(),
  sequence: z.coerce.number().int().min(1).max(500).optional(),
  dueAt: z.union([z.iso.datetime(), z.literal(""), z.null()]).optional(),
  maxScore: z.union([z.literal(""), z.null(), z.coerce.number().int().min(0).max(10000)]).optional(),
  isMandatory: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  if (!isTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  if ((await checkRateLimit(request, "admin-task-edit", 30)).limited) {
    return NextResponse.json({ error: "Too many task updates. Try again shortly." }, { status: 429 });
  }
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message ?? "Invalid task update details." }, { status: 400 });
  }

  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Task service is not configured." }, { status: 503 });
  const tasksTable = resources.tables.tasks;

  const { taskId } = await params;
  try {
    const existing = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: tasksTable, rowId: taskId }) as Record<string, unknown>;
    if (input.data.sequence !== undefined && input.data.sequence !== Number(existing.sequence)) {
      const duplicate = await service.tablesDB.listRows({
        databaseId: service.databaseId,
        tableId: tasksTable,
        queries: [Query.equal("internshipId", String(existing.internshipId)), Query.equal("sequence", input.data.sequence), Query.limit(1)],
      });
      if (duplicate.rows.some((row) => row.$id !== taskId)) {
        return NextResponse.json({ error: "That sequence number is already used for this internship." }, { status: 409 });
      }
    }

    const patch: Record<string, unknown> = {};
    if (input.data.title !== undefined) patch.title = input.data.title;
    if (input.data.instructions !== undefined) {
      if (!input.data.instructions && !existing.resourceFileId) {
        return NextResponse.json({ error: "Enter at least 10 characters of instructions when no PDF is attached." }, { status: 400 });
      }
      if (input.data.instructions && input.data.instructions.length < 10 && !existing.resourceFileId) {
        return NextResponse.json({ error: "Instructions must be at least 10 characters when no PDF is attached." }, { status: 400 });
      }
      patch.instructions =
        input.data.instructions ||
        "All internship tasks and deliverables are included in the attached Task PDF. Download the PDF to review the tasks and submit your work.";
    }
    if (input.data.sequence !== undefined) patch.sequence = input.data.sequence;
    if (input.data.dueAt !== undefined) patch.dueAt = input.data.dueAt || null;
    if (input.data.maxScore !== undefined) patch.maxScore = input.data.maxScore === "" ? null : input.data.maxScore;
    if (input.data.isMandatory !== undefined) patch.isMandatory = input.data.isMandatory;
    if (input.data.isPublished !== undefined) patch.isPublished = input.data.isPublished;

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "No task fields were provided to update." }, { status: 400 });
    }

    const updated = await service.tablesDB.updateRow({
      databaseId: service.databaseId,
      tableId: tasksTable,
      rowId: taskId,
      data: patch,
    });
    await writeAuditLog(service, admin.$id, "task.updated", taskId, { fields: Object.keys(patch) }, "task");
    return NextResponse.json({ updated: true, task: updated });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return NextResponse.json({ error: code === 404 ? "Task not found." : "Could not update task." }, { status: code === 404 ? 404 : 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  if (!isTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  if ((await checkRateLimit(request, "admin-task-delete", 15)).limited) {
    return NextResponse.json({ error: "Too many delete requests. Try again shortly." }, { status: 429 });
  }
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) {
    return NextResponse.json({ error: "Task service is not configured." }, { status: 503 });
  }
  const tasksTable = resources.tables.tasks;
  const submissionsTable = resources.tables.submissions;

  const { taskId } = await params;
  try {
    await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: tasksTable, rowId: taskId });
    const existingSubmissions = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId: submissionsTable,
      queries: [Query.equal("taskId", taskId), Query.limit(1)],
    });
    if (existingSubmissions.total > 0) {
      return NextResponse.json(
        { error: "Cannot delete this task because student submissions exist. Unpublish it instead." },
        { status: 409 }
      );
    }

    const assignmentsTable = resources.tables.taskAssignments;
    const assignments = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId: assignmentsTable,
      queries: [Query.equal("taskId", taskId), Query.limit(100)],
    });
    for (const row of assignments.rows) {
      await service.tablesDB.deleteRow({ databaseId: service.databaseId, tableId: assignmentsTable, rowId: row.$id }).catch(() => undefined);
    }

    await service.tablesDB.deleteRow({ databaseId: service.databaseId, tableId: tasksTable, rowId: taskId });
    await writeAuditLog(service, admin.$id, "task.deleted", taskId, {}, "task");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return NextResponse.json({ error: code === 404 ? "Task not found." : "Could not delete task." }, { status: code === 404 ? 404 : 500 });
  }
}
