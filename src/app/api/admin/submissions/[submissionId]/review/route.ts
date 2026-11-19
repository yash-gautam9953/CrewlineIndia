import { NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";
import { autoIssueCompletionCertificatesForApprovedSubmission, getDocumentsConfig, writeAuditLog } from "@/lib/documents/document-service";

const schema = z.object({
  decision: z.enum(["revision_required", "approved", "rejected"]),
  feedback: z.string().trim().min(5, "Feedback must be at least 5 characters.").max(5000),
  score: z.union([z.literal(""), z.coerce.number().int().min(0).max(10000)]).optional().default(""),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  if (isRateLimited(request, "admin-submission-review", 40)) {
    return NextResponse.json({ error: "Too many review requests. Try again shortly." }, { status: 429 });
  }
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    const errorMsg = input.error.issues[0]?.message ?? "Choose a review decision and provide meaningful feedback.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const service = createPrivilegedAppwriteClient();
  const submissionsTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  const reviewsTable = process.env.APPWRITE_REVIEWS_TABLE_ID;
  const enrollmentsTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const paymentsTable = process.env.APPWRITE_PAYMENTS_TABLE_ID;
  if (!service || !submissionsTable || !reviewsTable || !enrollmentsTable) {
    return NextResponse.json({ error: "Review service is not configured." }, { status: 503 });
  }

  const { submissionId } = await params;
  try {
    const submission = await service.tablesDB.getRow({
      databaseId: service.databaseId,
      tableId: submissionsTable,
      rowId: submissionId,
    });
    if (["approved", "rejected"].includes(String(submission.status))) {
      return NextResponse.json({ error: "This submission already has a final decision." }, { status: 409 });
    }

    const studentId = String(submission.studentId);
    const enrollmentId = String(submission.enrollmentId);

    // Section 6 & 7: Check payment verification before final approval
    if (input.data.decision === "approved" && paymentsTable) {
      const paymentRows = await service.tablesDB.listRows({
        databaseId: service.databaseId,
        tableId: paymentsTable,
        queries: [
          Query.equal("studentId", studentId),
          Query.equal("enrollmentId", enrollmentId),
          Query.limit(1),
        ],
      });
      const payment = paymentRows.rows[0];
      if (payment && !["verified", "waived", "not_applicable"].includes(String(payment.status))) {
        return NextResponse.json({
          error: `Payment is currently '${String(payment.status).replaceAll("_", " ")}'. Please verify the student's payment before approving the project.`,
        }, { status: 400 });
      }
    }

    const reviewedAt = new Date().toISOString();

    // 1. Record review decision in reviews table
    await service.tablesDB.createRow({
      databaseId: service.databaseId,
      tableId: reviewsTable,
      rowId: ID.unique(),
      data: {
        submissionId,
        reviewerId: admin.$id,
        feedback: input.data.feedback,
        score: input.data.score === "" ? null : input.data.score,
        decision: input.data.decision,
        reviewedAt,
      },
    });

    // 2. Update submission status
    await service.tablesDB.updateRow({
      databaseId: service.databaseId,
      tableId: submissionsTable,
      rowId: submissionId,
      data: { status: input.data.decision },
    });

    let generatedCertificates = false;

    // 3. If approved, mark enrollment as completed and generate both certificates
    if (input.data.decision === "approved") {
      try {
        await service.tablesDB.updateRow({
          databaseId: service.databaseId,
          tableId: enrollmentsTable,
          rowId: enrollmentId,
          data: {
            status: "completed",
            completedAt: reviewedAt,
          },
        });
      } catch (enrollmentErr) {
        console.error("[review] Could not update enrollment to completed:", enrollmentErr);
      }

      // Automatically generate Internship Completion Certificate & Project Completion Certificate
      try {
        await autoIssueCompletionCertificatesForApprovedSubmission(submissionId, admin.$id);
        generatedCertificates = true;
      } catch (certError) {
        console.error("[review] Auto certificate generation error:", certError);
      }
    }

    const audit = getDocumentsConfig();
    if (audit) {
      await writeAuditLog(
        audit,
        admin.$id,
        `submission.${input.data.decision}`,
        submissionId,
        {
          score: input.data.score === "" ? null : input.data.score,
          feedback: input.data.feedback,
          enrollmentId,
          studentId,
          generatedCertificates,
        },
        "submission"
      );
    }

    return NextResponse.json({ reviewed: true, certificatesIssued: generatedCertificates });
  } catch (error) {
    console.error("[review] Submission review failed:", error);
    const message = error instanceof Error ? error.message : "Submission was not found or could not be reviewed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
