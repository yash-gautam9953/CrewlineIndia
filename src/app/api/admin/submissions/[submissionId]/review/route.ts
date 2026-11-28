import { after, NextResponse } from "next/server";
import { ID, Query, type Models } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security";
import { autoIssueCompletionCertificatesForApprovedSubmission, getDocumentsConfig, writeAuditLog } from "@/lib/documents/document-service";
import { sendCrewlineEmail, submissionReviewEmail } from "@/lib/email";

const schema = z
  .object({
    decision: z.enum(["revision_required", "approved", "rejected"]),
    feedback: z.string().trim().max(5000).optional().default(""),
    score: z.union([z.literal(""), z.coerce.number().int().min(0).max(10000)]).optional().default(""),
  })
  .refine(
    (value) => value.decision === "approved" || value.feedback.trim().length >= 5,
    "Please provide at least 5 characters of feedback when requesting revision or rejecting."
  );

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

    const reviewedAt = new Date().toISOString();
    const effectiveFeedback =
      input.data.feedback.trim() ||
      "Approved by Crewline admin. Project and payment verified.";

    // Record review + update submission status concurrently (and auto-verify payment + mark completed when approved)
    const approvalWrites: Promise<unknown>[] = [
      service.tablesDB.createRow<Models.DefaultRow>({
        databaseId: service.databaseId,
        tableId: reviewsTable,
        rowId: ID.unique(),
        data: {
          submissionId,
          reviewerId: admin.$id,
          feedback: effectiveFeedback,
          score: input.data.score === "" ? null : input.data.score,
          decision: input.data.decision,
          reviewedAt,
        },
      }),
      service.tablesDB.updateRow<Models.DefaultRow>({
        databaseId: service.databaseId,
        tableId: submissionsTable,
        rowId: submissionId,
        data: { status: input.data.decision },
      }),
    ];

    if (input.data.decision === "approved") {
      approvalWrites.push(
        service.tablesDB.updateRow({
          databaseId: service.databaseId,
          tableId: enrollmentsTable,
          rowId: enrollmentId,
          data: { status: "completed", completedAt: reviewedAt },
        }).catch((enrollmentErr) => console.error("[review] Could not update enrollment to completed:", enrollmentErr))
      );
      if (paymentsTable) {
        approvalWrites.push(
          service.tablesDB
            .listRows({
              databaseId: service.databaseId,
              tableId: paymentsTable,
              queries: [Query.equal("studentId", studentId), Query.equal("enrollmentId", enrollmentId), Query.limit(1)],
            })
            .then((paymentRows) => {
              const payment = paymentRows.rows[0];
              if (payment && !["verified", "waived"].includes(String(payment.status))) {
                return service.tablesDB.updateRow({
                  databaseId: service.databaseId,
                  tableId: paymentsTable,
                  rowId: payment.$id,
                  data: {
                    status: "verified",
                    verifiedBy: admin.$id,
                    verifiedAt: reviewedAt,
                    verificationReason: "Verified by admin on final approval",
                  },
                });
              }
            })
        );
      }
    }

    await Promise.all(approvalWrites);

    let generatedCertificates = false;

    // Generate Internship Completion Certificate & Project Completion Certificate in parallel
    if (input.data.decision === "approved") {
      try {
        await autoIssueCompletionCertificatesForApprovedSubmission(submissionId, admin.$id);
        generatedCertificates = true;
      } catch (certError) {
        console.error("[review] Auto certificate generation error:", certError);
      }
    }

    after(async () => {
      const audit = await getDocumentsConfig().catch(() => null);
      await Promise.all([
        audit
          ? writeAuditLog(
              audit,
              admin.$id,
              `submission.${input.data.decision}`,
              submissionId,
              {
                score: input.data.score === "" ? null : input.data.score,
                feedback: effectiveFeedback,
                enrollmentId,
                studentId,
                generatedCertificates,
              },
              "submission"
            )
          : Promise.resolve(),
        sendCrewlineEmail({
          userId: studentId,
          subject: `Crewline project review update: ${input.data.decision.replaceAll("_", " ")}`,
          html: submissionReviewEmail({
            decision: input.data.decision,
            feedback: effectiveFeedback,
            certificatesIssued: generatedCertificates,
          }),
        }).catch((err) => console.error("[review] Async email error:", err)),
      ]);
    });

    return NextResponse.json({ reviewed: true, certificatesIssued: generatedCertificates });
  } catch (error) {
    console.error("[review] Submission review failed:", error);
    const message = error instanceof Error ? error.message : "Submission was not found or could not be reviewed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
