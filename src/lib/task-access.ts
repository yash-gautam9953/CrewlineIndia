import "server-only";
import { Query, type TablesDB } from "node-appwrite";

export async function studentCanAccessTask(tablesDB: TablesDB, databaseId: string, task: Record<string, unknown>, studentId: string) {
  const enrollmentTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  if (!enrollmentTable) return false;
  const enrollments = await tablesDB.listRows({ databaseId, tableId: enrollmentTable, queries: [Query.equal("studentId", studentId), Query.equal("internshipId", String(task.internshipId)), Query.limit(100)] });
  if (!enrollments.rows.some((row) => row.status === "active" || row.status === "completed")) return false;
  if (task.assignmentMode !== "selected_students") return true;
  const assignmentsTable = process.env.APPWRITE_TASK_ASSIGNMENTS_TABLE_ID;
  if (!assignmentsTable) return false;
  const assignments = await tablesDB.listRows({ databaseId, tableId: assignmentsTable, queries: [Query.equal("taskId", String(task.$id ?? "")), Query.equal("studentId", studentId), Query.limit(1)] });
  return assignments.total > 0;
}
