import { NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security";
import { autoIssueCompletionCertificatesForApprovedSubmission, getDocumentsConfig, writeAuditLog } from "@/lib/documents/document-service";
import { sendCrewlineEmail, submissionReviewEmail } from "@/lib/email";

const schema = z.object({
  decision: z.enum(["revision_required", "approved", "rejected"]),
  feedback: z.string().trim().min(5, "Feedback must be at least 5 characters.").max(5000),
  score: z.union([z.literal(""), z.coerce.number().int().min(0).max(10000)]).optional().default(""),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  if (!isTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  if ((await checkRateLimit(request, "admin-submission-review", 40)).limited) {
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
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) {
    return NextResponse.json({ error: "Review service is not configured." }, { status: 503 });
  }
  const submissionsTable = resources.tables.submissions;
  const reviewsTable = resources.tables.reviews;
  const enrollmentsTable = resources.tables.enrollments;
  const paymentsTable = resources.tables.payments;

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

    const audit = await getDocumentsConfig();
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

    await sendCrewlineEmail({
      userId: studentId,
      subject: `Crewline project review update: ${input.data.decision.replaceAll("_", " ")}`,
      html: submissionReviewEmail({
        decision: input.data.decision,
        feedback: input.data.feedback,
        certificatesIssued: generatedCertificates,
      }),
    });

    return NextResponse.json({ reviewed: true, certificatesIssued: generatedCertificates });
  } catch (error) {
    console.error("[review] Submission review failed:", error);
    const message = error instanceof Error ? error.message : "Submission was not found or could not be reviewed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
