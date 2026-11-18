import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { calculateInternshipDates, type InternshipDuration } from "@/lib/internship-dates";
import { createNotification } from "@/lib/notifications";

type ApplicationForEnrollment = Record<string, unknown> & { $id: string; studentId: string; internshipId: string };

export async function ensureEnrollmentForApprovedApplication(application: ApplicationForEnrollment, approvedBy: string) {
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  if (!service || !tableId) throw new Error("Enrollment storage is not configured.");
  const existing = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("studentId", application.studentId), Query.equal("internshipId", application.internshipId), Query.limit(1)] });
  if (existing.rows[0]) return { row: existing.rows[0], created: false };

  const duration = application.selectedDuration as InternshipDuration | undefined;
  const startDate = typeof application.requestedStartDate === "string" ? application.requestedStartDate.slice(0, 10) : "";
  if (!duration || !startDate) throw new Error("This application predates selected-duration scheduling. Add a start date and duration before enrolling the student.");
  const dates = calculateInternshipDates(startDate, duration);
  const row = await service.tablesDB.createRow({
    databaseId: service.databaseId,
    tableId,
    rowId: ID.unique(),
    data: {
      studentId: application.studentId,
      internshipId: application.internshipId,
      applicationId: application.$id,
      selectedDuration: duration,
      status: "active",
      startedAt: dates.startAt,
      scheduledEndAt: dates.endAt,
      submissionDeadlineAt: dates.submissionDeadlineAt,
      originalSubmissionDeadlineAt: dates.submissionDeadlineAt,
      completedAt: null,
      deadlineExtensionReason: null,
      deadlineExtendedBy: null,
      deadlineExtendedAt: null,
    },
    permissions: [Permission.read(Role.user(application.studentId))],
  });

  const paymentTable = process.env.APPWRITE_PAYMENTS_TABLE_ID;
  if (paymentTable) {
    try {
      await service.tablesDB.createRow({ databaseId: service.databaseId, tableId: paymentTable, rowId: ID.unique(), data: { studentId: application.studentId, applicationId: application.$id, enrollmentId: row.$id, amountDue: null, currency: "INR", status: "not_applicable", transactionReference: null, proofFileId: null, verificationReason: null, verifiedBy: null, verifiedAt: null, createdBy: approvedBy, createdAt: new Date().toISOString() }, permissions: [Permission.read(Role.user(application.studentId))] });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
      if (code !== 409) console.error("[enrollment] Could not create default not-applicable payment record", { code });
    }
  }

  await createNotification({ userId: application.studentId, eventKey: `enrollment-created:${row.$id}`, title: "Internship enrollment created", body: "Your internship schedule and project deadline are now available in your dashboard.", type: "enrollment", targetUrl: "/account", sendEmail: false }).catch(() => undefined);
  return { row, created: true };
}
