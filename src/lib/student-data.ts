import "server-only";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export async function getStudentData(userId: string) {
  const service = createPrivilegedAppwriteClient();
  const profileTable = process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID;
  const applicationTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const internshipTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  const enrollmentTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const taskTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const submissionTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  if (!service || !profileTable || !applicationTable || !internshipTable) throw new Error("Student data storage is not configured.");

  const [profiles, applications, enrollmentRows] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: profileTable, queries: [Query.equal("authUserId", userId), Query.limit(1)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationTable, queries: [Query.equal("studentId", userId), Query.orderDesc("$createdAt"), Query.limit(50)] }),
    enrollmentTable ? service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentTable, queries: [Query.equal("studentId", userId), Query.orderDesc("$createdAt"), Query.limit(50)] }) : Promise.resolve({ rows: [], total: 0 }),
  ]);
  const rows = applications.rows;
  const internshipIds = [...new Set(rows.map((row) => row.internshipId))];
  const internshipResults = await Promise.all(internshipIds.map(async (id) => {
    try { return await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipTable, rowId: id }); }
    catch { return null; }
  }));
  const internships = new Map(internshipResults.filter(Boolean).map((row) => [row!.$id, row as typeof internshipResults[number] & Record<string, unknown>]));
  const enrollments = enrollmentRows.rows;
  const enrolledPrograms = [...new Set(enrollments.map((row) => String(row.internshipId)))];
  const tasks = taskTable && enrolledPrograms.length ? (await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: taskTable, queries: [Query.equal("internshipId", enrolledPrograms), Query.equal("isPublished", true), Query.orderAsc("sequence"), Query.limit(100)] })).rows : [];
  const submissions = submissionTable ? (await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionTable, queries: [Query.equal("studentId", userId), Query.orderDesc("$createdAt"), Query.limit(100)] })).rows : [];
  const reviewsTable = process.env.APPWRITE_REVIEWS_TABLE_ID;
  const reviews = reviewsTable && submissions.length ? (await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: reviewsTable, queries: [Query.equal("submissionId", submissions.map((row) => row.$id)), Query.orderDesc("reviewedAt"), Query.limit(100)] })).rows : [];
  const latestSubmissionByTask = new Map<string, (typeof submissions)[number]>();
  for (const row of submissions) if (!latestSubmissionByTask.has(String(row.taskId))) latestSubmissionByTask.set(String(row.taskId), row);
  return {
    profile: profiles.rows[0] as (typeof profiles.rows)[number] & Record<string, unknown> | undefined,
    applications: rows.map((row) => ({
      id: row.$id,
      createdAt: row.$createdAt,
      status: row.status,
      offerStatus: typeof (row as typeof row & Record<string, unknown>).offerStatus === "string" ? (row as typeof row & Record<string, unknown>).offerStatus : "not_prepared",
      internshipTitle: typeof internships.get(row.internshipId)?.title === "string" ? String(internships.get(row.internshipId)?.title) : "Internship program",
      domain: typeof internships.get(row.internshipId)?.domain === "string" ? String(internships.get(row.internshipId)?.domain) : "",
    })),
    enrollments: enrollments.map((row) => ({ id: row.$id, status: String(row.status), internshipTitle: String(internships.get(String(row.internshipId))?.title ?? "Internship program"), domain: String(internships.get(String(row.internshipId))?.domain ?? "") })),
    tasks: tasks.map((task) => {
      const submission = latestSubmissionByTask.get(task.$id);
      const review = submission ? reviews.find((candidate) => candidate.submissionId === submission.$id) : undefined;
      const taskData = task as typeof task & Record<string, unknown>;
      return { id: task.$id, internshipTitle: String(internships.get(String(taskData.internshipId))?.title ?? "Internship"), title: String(taskData.title), instructions: String(taskData.instructions), dueAt: typeof taskData.dueAt === "string" ? taskData.dueAt : "", maxScore: taskData.maxScore, submissionId: submission?.$id ?? "", submissionStatus: String(submission?.status ?? "not_submitted"), repositoryUrl: String(submission?.repositoryUrl ?? ""), liveUrl: String(submission?.liveUrl ?? ""), explanation: String(submission?.explanation ?? ""), feedback: review ? String((review as typeof review & Record<string, unknown>).feedback ?? "") : "", score: review ? (review as typeof review & Record<string, unknown>).score : null };
    }),
  };
}
