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
  const taskAssignmentsTable = process.env.APPWRITE_TASK_ASSIGNMENTS_TABLE_ID;
  const notificationTable = process.env.APPWRITE_NOTIFICATIONS_TABLE_ID;
  if (!service || !profileTable || !applicationTable || !internshipTable) throw new Error("Student data storage is not configured.");

  const [profiles, applications, enrollmentRows, notificationRows] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: profileTable, queries: [Query.equal("authUserId", userId), Query.limit(1)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationTable, queries: [Query.equal("studentId", userId), Query.orderDesc("$createdAt"), Query.limit(50)] }),
    enrollmentTable ? service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentTable, queries: [Query.equal("studentId", userId), Query.orderDesc("$createdAt"), Query.limit(50)] }) : Promise.resolve({ rows: [], total: 0 }),
    notificationTable ? service.tablesDB.listRows({ databaseId: service.databaseId, tableId: notificationTable, queries: [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(50)] }) : Promise.resolve({ rows: [], total: 0 }),
  ]);
  const rows = applications.rows;
  const internshipIds = [...new Set(rows.map((row) => row.internshipId))];
  const internshipResults = await Promise.all(internshipIds.map(async (id) => {
    try { return await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipTable, rowId: id }); }
    catch { return null; }
  }));
  const internships = new Map(internshipResults.filter(Boolean).map((row) => [row!.$id, row as typeof internshipResults[number] & Record<string, unknown>]));
  const enrollments = enrollmentRows.rows;
  const activeEnrollments = enrollments.filter((row) => row.status === "active" || row.status === "completed");
  const enrolledPrograms = [...new Set(activeEnrollments.map((row) => String(row.internshipId)))];
  const allTasks = taskTable && enrolledPrograms.length ? (await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: taskTable, queries: [Query.equal("internshipId", enrolledPrograms), Query.equal("isPublished", true), Query.orderAsc("sequence"), Query.limit(100)] })).rows : [];
  const selectedTaskIds = taskAssignmentsTable && allTasks.length ? new Set((await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: taskAssignmentsTable, queries: [Query.equal("studentId", userId), Query.equal("taskId", allTasks.map((task) => task.$id)), Query.limit(100)] })).rows.map((row) => String(row.taskId))) : new Set<string>();
  const tasks = allTasks.filter((task) => (task as typeof task & Record<string, unknown>).assignmentMode !== "selected_students" || selectedTaskIds.has(task.$id));
  const submissions = submissionTable ? (await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionTable, queries: [Query.equal("studentId", userId), Query.orderDesc("$createdAt"), Query.limit(100)] })).rows : [];
  const reviewsTable = process.env.APPWRITE_REVIEWS_TABLE_ID;
  const reviews = reviewsTable && submissions.length ? (await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: reviewsTable, queries: [Query.equal("submissionId", submissions.map((row) => row.$id)), Query.orderDesc("reviewedAt"), Query.limit(100)] })).rows : [];
  const paymentsTable = process.env.APPWRITE_PAYMENTS_TABLE_ID;
  const payments = paymentsTable && enrollments.length ? (await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentsTable, queries: [Query.equal("studentId", userId), Query.limit(100)] })).rows : [];
  const latestSubmissionByTask = new Map<string, (typeof submissions)[number]>();
  const submissionHistoryByTask = new Map<string, (typeof submissions)[number][]>();
  for (const row of submissions) if (!latestSubmissionByTask.has(String(row.taskId))) latestSubmissionByTask.set(String(row.taskId), row);
  for (const row of submissions) {
    const key = String(row.taskId);
    submissionHistoryByTask.set(key, [...(submissionHistoryByTask.get(key) ?? []), row]);
  }
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
    enrollments: enrollments.map((row) => {
      const data = row as typeof row & Record<string, unknown>;
      const payment = payments.find((candidate) => candidate.enrollmentId === row.$id) as (typeof payments)[number] & Record<string, unknown> | undefined;
      const daysRemaining = typeof data.scheduledEndAt === "string" && data.scheduledEndAt
        ? Math.max(0, Math.ceil((new Date(data.scheduledEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;
      return { id: row.$id, status: String(row.status), internshipId: String(row.internshipId), selectedDuration: String(data.selectedDuration ?? ""), internshipTitle: String(internships.get(String(row.internshipId))?.title ?? "Internship program"), domain: String(internships.get(String(row.internshipId))?.domain ?? ""), startedAt: typeof data.startedAt === "string" ? data.startedAt : "", scheduledEndAt: typeof data.scheduledEndAt === "string" ? data.scheduledEndAt : "", completedAt: typeof data.completedAt === "string" ? data.completedAt : "", submissionDeadlineAt: typeof data.submissionDeadlineAt === "string" ? data.submissionDeadlineAt : "", originalSubmissionDeadlineAt: typeof data.originalSubmissionDeadlineAt === "string" ? data.originalSubmissionDeadlineAt : "", deadlineExtensionReason: typeof data.deadlineExtensionReason === "string" ? data.deadlineExtensionReason : "", daysRemaining, payment: payment ? { id: payment.$id, status: String(payment.status), amountDue: payment.amountDue ?? null, currency: String(payment.currency ?? "INR"), instructions: String(payment.paymentInstructions ?? ""), transactionReference: String(payment.transactionReference ?? ""), proofFileId: String(payment.proofFileId ?? ""), verificationReason: String(payment.verificationReason ?? "") } : null };
    }),
    tasks: tasks.map((task) => {
      const submission = latestSubmissionByTask.get(task.$id);
      const review = submission ? reviews.find((candidate) => candidate.submissionId === submission.$id) : undefined;
      const taskData = task as typeof task & Record<string, unknown>;
      const enrollment = activeEnrollments.find((candidate) => String(candidate.internshipId) === String(taskData.internshipId));
      const enrollmentData = enrollment as (typeof enrollment & Record<string, unknown>) | undefined;
      const submittedAt = submission?.submittedAt ?? "";
      const submissionRecord = submission as (typeof submission & Record<string, unknown>) | undefined;
      const submittedBusinessDate = typeof submissionRecord?.submittedAt === "string" ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(submissionRecord.submittedAt)) : "";
      const late = Boolean(submission && (submission.isLate || (submittedBusinessDate && enrollmentData?.submissionDeadlineAt && submittedBusinessDate > String(enrollmentData.submissionDeadlineAt).slice(0, 10))));
      const attachmentList = (submission: (typeof submissions)[number] | undefined) => {
        if (!submission) return [];
        const record = submission as typeof submission & Record<string, unknown>;
        try { return JSON.parse(String(record.fileNames ?? "[]")) as { id: string; name: string }[]; } catch { return []; }
      };
      const history = (submissionHistoryByTask.get(task.$id) ?? []).map((version) => {
        const versionRecord = version as typeof version & Record<string, unknown>;
        const versionReview = reviews.find((candidate) => candidate.submissionId === version.$id) as ((typeof reviews)[number] & Record<string, unknown>) | undefined;
        return { id: version.$id, version: Number(versionRecord.version ?? 1), status: String(versionRecord.status), submittedAt: String(versionRecord.submittedAt ?? ""), feedback: String(versionReview?.feedback ?? ""), score: versionReview?.score ?? null };
      });
      return { id: task.$id, internshipId: String(taskData.internshipId), enrollmentId: enrollment?.$id ?? "", internshipTitle: String(internships.get(String(taskData.internshipId))?.title ?? "Internship"), title: String(taskData.title), instructions: String(taskData.instructions), isMandatory: Boolean(taskData.isMandatory), dueAt: typeof taskData.dueAt === "string" ? taskData.dueAt : "", resourceFileId: String(taskData.resourceFileId ?? ""), resourceFileName: String(taskData.resourceFileName ?? ""), resourceVersion: Number(taskData.resourceVersion ?? 1), maxScore: taskData.maxScore, submissionId: submission?.$id ?? "", submissionStatus: late ? "late_submission" : String(submission?.status ?? "not_started"), submittedAt: String(submittedAt), projectTitle: String((submission as (typeof submission & Record<string, unknown>) | undefined)?.projectTitle ?? ""), projectDescription: String((submission as (typeof submission & Record<string, unknown>) | undefined)?.projectDescription ?? ""), repositoryUrl: String(submission?.repositoryUrl ?? ""), liveUrl: String(submission?.liveUrl ?? ""), explanation: String(submission?.explanation ?? ""), attachments: attachmentList(submission), feedback: review ? String((review as typeof review & Record<string, unknown>).feedback ?? "") : "", score: review ? (review as typeof review & Record<string, unknown>).score : null, history };
    }),
    notifications: notificationRows.rows.map((row) => ({ id: row.$id, title: String(row.title), body: String(row.body), type: String(row.type), isRead: Boolean(row.isRead), createdAt: row.$createdAt, targetUrl: String(row.targetUrl ?? "") })),
  };
}
