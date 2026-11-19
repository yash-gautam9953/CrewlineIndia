import "server-only";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import type { DocumentType } from "./document-id-generator";
import { calculateInternshipDates, type InternshipDuration } from "@/lib/internship-dates";

export type DocumentSnapshot = {
  documentType: DocumentType;
  documentId: string;
  studentId: string;
  studentName: string;
  documentTitle: string;
  domain: string;
  duration: string;
  startDate: string;
  endDate: string;
  completionDate: string;
  issueDate: string;
  workMode: string;
  stipend: string;
  terms: string;
  sourceId: string;
  internshipId: string;
  projectTitle: string;
  signatoryName: string;
  signatoryDesignation: string;
  signatorySignatureFileId: string;
  templateVersion: string;
  verificationUrl: string;
  reissuedFrom: string;
  reissueReason: string;
};

export type DocumentPreparationOptions = { offerDetails?: { startDate?: string; duration?: string; workMode?: string; stipend?: string; terms?: string }; reissueFromId?: string; reissueReason?: string };

export async function readSignatorySettings() {
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_WEBSITE_CONTENT_TABLE_ID;
  if (!service || !tableId) throw new Error("Signatory settings storage is not configured.");
  const result = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("contentKey", "authorized-signatory"), Query.limit(1)] });
  const row = result.rows[0] as (typeof result.rows)[number] & Record<string, unknown> | undefined;
  if (!row || typeof row.content !== "string") throw new Error("Authorized signatory details have not been configured.");
  const settings = JSON.parse(row.content) as { name?: unknown; designation?: unknown; signatureFileId?: unknown };
  if (typeof settings.name !== "string" || !settings.name.trim() || typeof settings.designation !== "string" || !settings.designation.trim()) {
    throw new Error("Authorized signatory details (name and designation) have not been configured.");
  }
  return {
    rowId: row.$id,
    name: settings.name.trim(),
    designation: settings.designation.trim(),
    signatureFileId: typeof settings.signatureFileId === "string" ? settings.signatureFileId : "",
  };
}

export async function prepareDocument(type: DocumentType, sourceId: string, documentId: string, options: DocumentPreparationOptions = {}): Promise<DocumentSnapshot> {
  const service = createPrivilegedAppwriteClient();
  const applicationsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const internshipTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  const enrollmentsTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const tasksTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const submissionsTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  if (!service) throw new Error("Appwrite is not configured.");
  const signatory = await readSignatorySettings();
  const now = new Date().toISOString();
  const base = { documentType: type, documentId, issueDate: now, completionDate: now, workMode: "Remote", stipend: "", terms: "", projectTitle: "", startDate: "", endDate: "", sourceId, internshipId: "", signatoryName: signatory.name, signatoryDesignation: signatory.designation, signatorySignatureFileId: signatory.signatureFileId, templateVersion: "1.0", verificationUrl: "", reissuedFrom: options.reissueFromId ?? "", reissueReason: options.reissueReason ?? "" };

  if (type === "offer") {
    if (!applicationsTable || !internshipTable) throw new Error("Offer letter tables are not configured.");
    const application = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: applicationsTable, rowId: sourceId }) as Record<string, unknown>;
    if (application.status !== "approved") throw new Error("Offer letters are available after an application is approved.");
    const internship = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipTable, rowId: String(application.internshipId) }) as Record<string, unknown>;
    const offerDetails = options.offerDetails;
    const start = offerDetails?.startDate || (typeof application.offerStartDate === "string" ? application.offerStartDate : "");
    const duration = offerDetails?.duration || String(application.offerDuration ?? "");
    const end = deriveEndDate(start, duration);
    if (!start || !end) throw new Error("The stored offer start date or duration cannot produce a valid end date. Correct the offer details before issuing the PDF.");
    const snapshot = { ...base, studentId: String(application.studentId), studentName: await studentName(String(application.studentId)), documentTitle: String(internship.title), domain: String(internship.domain), duration, startDate: start, endDate: end, workMode: offerDetails?.workMode || String(application.offerMode ?? "Remote"), stipend: offerDetails?.stipend ?? String(application.offerStipend ?? ""), terms: offerDetails?.terms ?? String(application.offerNotes ?? ""), sourceId, internshipId: String(application.internshipId) };
    return snapshot;
  }

  if (type === "internship_completion") {
    if (!enrollmentsTable || !internshipTable || !tasksTable || !submissionsTable) throw new Error("Internship completion tables are not configured.");
    const enrollment = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: enrollmentsTable, rowId: sourceId }) as Record<string, unknown>;
    if (enrollment.status !== "completed") throw new Error("Internship completion is not recorded for this enrollment.");
    const [internship, tasks] = await Promise.all([
      service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipTable, rowId: String(enrollment.internshipId) }),
      service.tablesDB.listRows({ databaseId: service.databaseId, tableId: tasksTable, queries: [Query.equal("internshipId", String(enrollment.internshipId)), Query.equal("isMandatory", true), Query.limit(100)] }),
    ]);
    await validatePaymentEligibility(String(enrollment.studentId), sourceId);
    for (const task of tasks.rows) {
      const taskData = task as typeof task & Record<string, unknown>;
      if (taskData.assignmentMode === "selected_students") {
        const assignmentsTable = process.env.APPWRITE_TASK_ASSIGNMENTS_TABLE_ID;
        if (!assignmentsTable) throw new Error("Selected-student task assignment data is not configured.");
        const assignment = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: assignmentsTable, queries: [Query.equal("taskId", task.$id), Query.equal("studentId", String(enrollment.studentId)), Query.limit(1)] });
        if (!assignment.total) continue;
      }
      const submissions = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.equal("studentId", String(enrollment.studentId)), Query.equal("taskId", task.$id), Query.equal("status", "approved"), Query.limit(1)] });
      if (!submissions.total) throw new Error("Every mandatory task must have an approved submission before the completion certificate can be issued.");
    }
    const title = String((internship as Record<string, unknown>).title ?? "Internship");
    const snapshot = { ...base, studentId: String(enrollment.studentId), studentName: await studentName(String(enrollment.studentId)), documentTitle: title, domain: String((internship as Record<string, unknown>).domain ?? ""), duration: String((internship as Record<string, unknown>).duration ?? ""), startDate: String(enrollment.startedAt ?? ""), endDate: String(enrollment.completedAt ?? ""), completionDate: String(enrollment.completedAt ?? now), sourceId, internshipId: String(enrollment.internshipId) };
    if (!snapshot.startDate || !snapshot.endDate) throw new Error("Enrollment start and completion dates must be recorded before certificate issuance.");
    snapshot.verificationUrl = `https://crewline.me/verify/${encodeURIComponent(documentId)}`;
    return snapshot;
  }

  if (!submissionsTable || !tasksTable || !enrollmentsTable || !internshipTable) throw new Error("Project certificate tables are not configured.");
  const submission = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: submissionsTable, rowId: sourceId }) as Record<string, unknown>;
  if (submission.status !== "approved") throw new Error("Project certificates are available only for approved project submissions.");
  const [task, enrollment] = await Promise.all([
    service.tablesDB.getRow({ databaseId: service.databaseId, tableId: tasksTable, rowId: String(submission.taskId) }),
    service.tablesDB.getRow({ databaseId: service.databaseId, tableId: enrollmentsTable, rowId: String(submission.enrollmentId) }),
  ]);
  await validatePaymentEligibility(String(submission.studentId), String(enrollment.$id));
  const internship = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipTable, rowId: String(enrollment.internshipId) }) as Record<string, unknown>;
  const reviewsTable = process.env.APPWRITE_REVIEWS_TABLE_ID;
  const approvalRows = reviewsTable ? await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: reviewsTable, queries: [Query.equal("submissionId", sourceId), Query.equal("decision", "approved"), Query.orderDesc("reviewedAt"), Query.limit(1)] }) : { rows: [] };
  if (!approvalRows.rows.length) throw new Error("An approved mentor review must be recorded before the project certificate can be issued.");
  const projectTitle = String((task as Record<string, unknown>).title ?? "Project");
  const approvedAt = (approvalRows.rows[0] as Record<string, unknown>).reviewedAt;
  const snapshot = { ...base, studentId: String(submission.studentId), studentName: await studentName(String(submission.studentId)), documentTitle: String(internship.title ?? "Internship"), projectTitle, domain: String(internship.domain ?? ""), duration: "", sourceId, internshipId: String(enrollment.internshipId), completionDate: typeof approvedAt === "string" ? approvedAt : now };
  snapshot.verificationUrl = `https://crewline.me/verify/${encodeURIComponent(documentId)}`;
  return snapshot;
}

async function studentName(userId: string) {
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID;
  if (!service || !tableId) throw new Error("Student profiles are not configured.");
  const rows = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("authUserId", userId), Query.limit(1)] });
  const name = rows.rows[0]?.fullName;
  if (typeof name !== "string" || !name.trim()) throw new Error("Student profile must have a verified full name before issuing this document.");
  return name;
}

async function validatePaymentEligibility(studentId: string, enrollmentId: string) {
  const service = createPrivilegedAppwriteClient();
  const paymentTable = process.env.APPWRITE_PAYMENTS_TABLE_ID;
  if (!service || !paymentTable) return;
  const payments = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentTable, queries: [Query.equal("studentId", studentId), Query.equal("enrollmentId", enrollmentId), Query.limit(1)] });
  const status = payments.rows[0]?.status;
  if (status && !["not_applicable", "verified", "waived"].includes(String(status))) throw new Error("A disclosed payment requirement is still awaiting submission or verification.");
}

function deriveEndDate(startValue: string, duration: string) {
  if (!( ["1 Month", "2 Months", "3 Months"] as string[]).includes(duration)) return "";
  try { return calculateInternshipDates(startValue.slice(0, 10), duration as InternshipDuration).endAt; }
  catch { return ""; }
}
