import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";
import { getDocumentsConfig, writeAuditLog } from "@/lib/documents/document-service";

const paymentAllowsCompletion = new Set(["not_applicable", "verified", "waived"]);

export async function POST(request: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
  if (isRateLimited(request, "enrollment-completion", 20)) return NextResponse.json({ error: "Too many completion requests. Try again shortly." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const service = createPrivilegedAppwriteClient();
  const enrollmentTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const taskTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const submissionsTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  if (!service || !enrollmentTable || !taskTable || !submissionsTable) return NextResponse.json({ error: "Enrollment completion is not configured." }, { status: 503 });
  const { enrollmentId } = await params;

  try {
    const enrollment = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: enrollmentTable, rowId: enrollmentId }) as Record<string, unknown>;
    if (enrollment.status === "completed") return NextResponse.json({ completed: true, alreadyCompleted: true });
    if (enrollment.status !== "active") return NextResponse.json({ error: "Only active enrollments can be marked complete." }, { status: 409 });

    const mandatory = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: taskTable, queries: [Query.equal("internshipId", String(enrollment.internshipId)), Query.equal("isMandatory", true), Query.equal("isPublished", true), Query.limit(100)] });
    if (!mandatory.rows.length) return NextResponse.json({ error: "Publish at least one mandatory task before completing this enrollment." }, { status: 409 });
    const selectedTasks = mandatory.rows.filter((task) => (task as typeof task & Record<string, unknown>).assignmentMode === "selected_students");
    let selectedTaskIds = new Set<string>();
    if (selectedTasks.length) {
      const assignmentsTable = process.env.APPWRITE_TASK_ASSIGNMENTS_TABLE_ID;
      if (!assignmentsTable) return NextResponse.json({ error: "Selected task assignment storage is not configured." }, { status: 503 });
      const assignments = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: assignmentsTable, queries: [Query.equal("studentId", String(enrollment.studentId)), Query.equal("taskId", selectedTasks.map((task) => task.$id)), Query.limit(100)] });
      selectedTaskIds = new Set(assignments.rows.map((row) => String(row.taskId)));
    }
    const requiredTaskIds = mandatory.rows.filter((task) => (task as typeof task & Record<string, unknown>).assignmentMode !== "selected_students" || selectedTaskIds.has(task.$id)).map((task) => task.$id);
    if (!requiredTaskIds.length) return NextResponse.json({ error: "This student has no assigned mandatory tasks to complete." }, { status: 409 });

    const approved = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.equal("enrollmentId", enrollmentId), Query.equal("status", "approved"), Query.limit(100)] });
    const approvedTaskIds = new Set(approved.rows.map((row) => String(row.taskId)));
    const missingCount = requiredTaskIds.filter((taskId) => !approvedTaskIds.has(taskId)).length;
    if (missingCount) return NextResponse.json({ error: `${missingCount} mandatory task${missingCount === 1 ? " is" : "s are"} still awaiting approval.` }, { status: 409 });

    const paymentTable = process.env.APPWRITE_PAYMENTS_TABLE_ID;
    if (paymentTable) {
      const payments = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentTable, queries: [Query.equal("enrollmentId", enrollmentId), Query.limit(1)] });
      const status = String(payments.rows[0]?.status ?? "not_applicable");
      if (!paymentAllowsCompletion.has(status)) return NextResponse.json({ error: "A disclosed payment request must be verified or waived before completion." }, { status: 409 });
    }

    const completedAt = new Date().toISOString();
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId: enrollmentTable, rowId: enrollmentId, data: { status: "completed", completedAt } });
    const config = getDocumentsConfig();
    if (config) await writeAuditLog(config, admin.$id, "enrollment.completed", enrollmentId, { studentId: enrollment.studentId, approvedMandatoryTaskCount: requiredTaskIds.length }, "enrollment");
    return NextResponse.json({ completed: true, completedAt });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return NextResponse.json({ error: code === 404 ? "Enrollment was not found." : "Enrollment could not be marked complete." }, { status: code === 404 ? 404 : 500 });
  }
}
