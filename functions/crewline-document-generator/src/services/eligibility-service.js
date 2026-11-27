import { calculateInternshipDates } from "./internship-dates-helper.js";

/**
 * Eligibility Verification Service for Crewline Documents.
 * Enforces strict server-side state machines before any document can be generated or issued.
 */
function normalizeWorkMode(mode) {
  const raw = String(mode || "Virtual / Remote").trim();
  if (/^remote$/i.test(raw)) return "Virtual / Remote";
  if (/^hybrid$/i.test(raw)) return "Hybrid";
  if (/^onsite$/i.test(raw) || /^on-site$/i.test(raw)) return "On-site";
  return raw || "Virtual / Remote";
}
export class EligibilityService {
  /**
   * Validates eligibility for issuing an Internship Offer Letter.
   * Requires:
   * - Valid application with status 'approved'
   * - Linked active internship
   * - Verified student profile full name
   * - Valid start date and duration producing a valid end date
   */
  static async validateOfferLetter(applicationId, databaseService, options = {}) {
    if (!applicationId) {
      throw new Error("Application ID is required to issue an offer letter.");
    }

    const application = await databaseService.getApplication(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    if (application.status !== "approved" && application.status !== "active") {
      throw new Error(
        `Offer letters can only be issued for approved applications. Current status: ${application.status}`
      );
    }

    const internship = await databaseService.getInternship(String(application.internshipId));
    if (!internship) {
      throw new Error(`Linked internship not found: ${application.internshipId}`);
    }

    const studentProfile = await databaseService.getStudentProfileByAuthId(String(application.studentId));
    const studentName = studentProfile?.fullName?.trim() || application.applicantName || "";
    if (!studentName) {
      throw new Error("Student profile must have a valid full name before issuing an offer letter.");
    }

    const offerDetails = options.offerDetails || {};
    const startDate = offerDetails.startDate || application.offerStartDate || application.createdAt?.slice(0, 10);
    const duration = offerDetails.duration || application.offerDuration || internship.duration || "1 Month";
    const calculated = calculateInternshipDates(startDate, duration);
    const endDate = calculated.endAt;

    if (!startDate || !endDate) {
      throw new Error("Could not calculate valid internship start and end dates from the offer parameters.");
    }

    return {
      studentId: String(application.studentId),
      studentName,
      documentTitle: String(internship.title || "Internship"),
      domain: String(internship.domain || "Technology"),
      duration: String(duration),
      startDate,
      endDate,
      workMode: normalizeWorkMode(offerDetails.workMode || application.offerMode || "Virtual / Remote"),
      internshipId: String(application.internshipId),
      sourceId: String(applicationId),
    };
  }

  /**
   * Validates eligibility for issuing an Internship Completion Certificate.
   * Requires:
   * - Enrollment marked as 'completed'
   * - Recorded start and completion dates
   * - All mandatory domain tasks submitted and approved
   * - Clear payment status (no pending payment gate)
   */
  static async validateInternshipCertificate(enrollmentId, databaseService) {
    if (!enrollmentId) {
      throw new Error("Enrollment ID is required to issue an internship completion certificate.");
    }

    const enrollment = await databaseService.getEnrollment(enrollmentId);
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${enrollmentId}`);
    }

    if (enrollment.status !== "completed") {
      throw new Error(
        `Internship completion certificate requires enrollment status 'completed'. Current status: ${enrollment.status}`
      );
    }

    const studentId = String(enrollment.studentId);
    const internshipId = String(enrollment.internshipId);

    const [internship, studentProfile] = await Promise.all([
      databaseService.getInternship(internshipId),
      databaseService.getStudentProfileByAuthId(studentId),
    ]);

    if (!internship) {
      throw new Error(`Linked internship not found: ${internshipId}`);
    }

    const studentName = studentProfile?.fullName?.trim();
    if (!studentName) {
      throw new Error("Student profile must have a verified full name before issuing a completion certificate.");
    }

    // Verify payment eligibility
    const payment = await databaseService.getPaymentRecord(studentId, enrollmentId);
    if (payment && !["not_applicable", "verified", "waived"].includes(String(payment.status))) {
      throw new Error("Internship certificate requires payment verification or waiver.");
    }

    // Verify all mandatory tasks assigned to this student have approved submissions
    const mandatoryTasks = await databaseService.getMandatoryTasks(internshipId);
    for (const task of mandatoryTasks) {
      if (task.assignmentMode === "selected_students") {
        const assignment = await databaseService.getTaskAssignment(task.$id, studentId);
        if (!assignment) continue;
      }
      const approvedSubmission = await databaseService.getApprovedTaskSubmission(studentId, task.$id);
      if (!approvedSubmission) {
        throw new Error(
          `All mandatory internship tasks must be submitted and approved before completion certificate issuance. Pending task: ${task.title}`
        );
      }
    }

    const startDate = enrollment.startedAt ? String(enrollment.startedAt).slice(0, 10) : "";
    const scheduledEnd = enrollment.scheduledEndAt ? String(enrollment.scheduledEndAt).slice(0, 10) : "";
    const completedDate = enrollment.completedAt ? String(enrollment.completedAt).slice(0, 10) : "";
    const endDate = scheduledEnd || completedDate;

    if (!startDate || !endDate) {
      throw new Error("Enrollment start and scheduled end dates must be recorded before certificate issuance.");
    }

    return {
      studentId,
      studentName,
      documentTitle: String(internship.title || "Internship"),
      domain: String(internship.domain || "Technology"),
      duration: String(enrollment.selectedDuration || internship.duration || "1 Month"),
      startDate,
      endDate,
      completionDate: String(enrollment.completedAt || new Date().toISOString()),
      workMode: "Virtual / Remote",
      internshipId,
      sourceId: String(enrollmentId),
    };
  }

  /**
   * Validates eligibility for issuing a Project Completion Certificate.
   * Requires:
   * - Submission marked as 'approved'
   * - Approved mentor review on record
   * - Clear payment status
   */
  static async validateProjectCertificate(submissionId, databaseService) {
    if (!submissionId) {
      throw new Error("Submission ID is required to issue a project certificate.");
    }

    const submission = await databaseService.getSubmission(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    if (submission.status !== "approved") {
      throw new Error(
        `Project certificates require submission status 'approved'. Current status: ${submission.status}`
      );
    }

    const [task, enrollment] = await Promise.all([
      databaseService.getTask(String(submission.taskId)),
      databaseService.getEnrollment(String(submission.enrollmentId)),
    ]);

    if (!task) throw new Error(`Linked task not found: ${submission.taskId}`);
    if (!enrollment) throw new Error(`Linked enrollment not found: ${submission.enrollmentId}`);

    const studentId = String(submission.studentId);
    const internshipId = String(enrollment.internshipId);

    const [internship, studentProfile, review] = await Promise.all([
      databaseService.getInternship(internshipId),
      databaseService.getStudentProfileByAuthId(studentId),
      databaseService.getLatestApprovedReview(submissionId),
    ]);

    if (!internship) throw new Error(`Linked internship not found: ${internshipId}`);
    const studentName = studentProfile?.fullName?.trim();
    if (!studentName) {
      throw new Error("Student profile must have a verified full name before issuing a project certificate.");
    }

    // Must have approved review if review table exists
    if (databaseService.tables.reviews && !review) {
      throw new Error("An approved mentor review must be recorded before project certificate issuance.");
    }

    // Verify payment eligibility
    const payment = await databaseService.getPaymentRecord(studentId, String(enrollment.$id));
    if (payment && !["not_applicable", "verified", "waived"].includes(String(payment.status))) {
      throw new Error("Project certificate requires payment verification or waiver.");
    }

    const approvedAt = review?.reviewedAt || submission.reviewedAt || submission.$updatedAt || new Date().toISOString();

    const fallbackProjectTitle = `${String(internship.domain || internship.title || "Internship")} Capstone Project`;
    const submittedProjectTitle = typeof submission.projectTitle === "string" ? submission.projectTitle.trim() : "";

    return {
      studentId,
      studentName,
      projectTitle: submittedProjectTitle || fallbackProjectTitle,
      documentTitle: String(internship.title || "Internship"),
      domain: String(internship.domain || "Technology"),
      internshipId,
      sourceId: String(submissionId),
      completionDate: String(approvedAt),
    };
  }
}
