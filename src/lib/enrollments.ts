import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { calculateInternshipDates, type InternshipDuration } from "@/lib/internship-dates";
import { readPaymentSettings } from "@/lib/payment-settings";

type ApplicationForEnrollment = Record<string, unknown> & { $id: string; studentId: string; internshipId: string };

export async function ensureEnrollmentForApprovedApplication(application: ApplicationForEnrollment, approvedBy: string) {
  const service = createPrivilegedAppwriteClient();
  if (!service) throw new Error("Enrollment storage is not configured.");
  const { tables } = await getAppwriteResources();
  const tableId = tables.enrollments;
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

  const paymentTable = tables.payments;
  if (paymentTable) {
    try {
      const paymentSettings = await readPaymentSettings();
      await service.tablesDB.createRow({
        databaseId: service.databaseId,
        tableId: paymentTable,
        rowId: ID.unique(),
        data: {
          studentId: application.studentId,
          applicationId: application.$id,
          enrollmentId: row.$id,
          amountDue: paymentSettings.feeAmount,
          currency: "INR",
          paymentInstructions: paymentSettings.instructions || "Complete the UPI payment using the Google Form scanner and submit your transaction reference below for verification.",
          status: "pending",
          transactionReference: null,
          proofFileId: null,
          verificationReason: null,
          verifiedBy: null,
          verifiedAt: null,
          createdBy: approvedBy,
          createdAt: new Date().toISOString(),
        },
        permissions: [Permission.read(Role.user(application.studentId))],
      });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
      if (code !== 409) console.error("[enrollment] Could not initialize pending payment record", { code });
    }
  }

  // Automatic domain task assignment
  const tasksTable = tables.tasks;
  const taskAssignmentsTable = tables.taskAssignments;
  let taskAssigned = false;
  let publishedTasksCount = 0;
  if (tasksTable) {
    try {
      const publishedTasks = await service.tablesDB.listRows({
        databaseId: service.databaseId,
        tableId: tasksTable,
        queries: [
          Query.equal("internshipId", application.internshipId),
          Query.equal("isPublished", true),
          Query.orderAsc("sequence"),
          Query.limit(50),
        ],
      });
      publishedTasksCount = publishedTasks.total;
      if (publishedTasks.rows.length > 0) {
        taskAssigned = true;
        for (const task of publishedTasks.rows) {
          const taskData = task as Record<string, unknown>;
          if (taskData.assignmentMode === "selected_students" && taskAssignmentsTable) {
            try {
              await service.tablesDB.createRow({
                databaseId: service.databaseId,
                tableId: taskAssignmentsTable,
                rowId: ID.unique(),
                data: {
                  taskId: task.$id,
                  studentId: application.studentId,
                  assignedBy: approvedBy || "system",
                  assignedAt: new Date().toISOString(),
                },
                permissions: [Permission.read(Role.user(application.studentId))],
              });
            } catch (assignError) {
              const code = typeof assignError === "object" && assignError !== null && "code" in assignError ? assignError.code : undefined;
              if (code !== 409) console.error("[enrollment] Could not assign task to student:", assignError);
            }
          }
        }
      } else {
        console.warn(`[enrollment] No published task found for internshipId ${application.internshipId}`);
      }
    } catch (taskError) {
      console.error("[enrollment] Failed querying domain tasks:", taskError);
    }
  }

  return { row, created: true, taskAssigned, publishedTasksCount };
}
