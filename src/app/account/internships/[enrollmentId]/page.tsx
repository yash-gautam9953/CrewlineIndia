import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Download, FileText, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { ID, Permission, Query, Role } from "node-appwrite";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { formatCrewlineDate } from "@/lib/internship-dates";
import { readPaymentSettings } from "@/lib/payment-settings";
import { TaskSubmissionForm } from "@/components/task-submission-form";
import { PaymentSubmissionForm } from "@/components/payment-submission-form";

export const metadata: Metadata = {
  title: "Internship Workspace | Crewline",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ enrollmentId: string }>;
  searchParams: Promise<{ enrolled?: string }>;
};

export default async function InternshipDetailsPage({ params, searchParams }: Props) {
  const session = await getSessionUser();
  if (!session) {
    const { enrollmentId } = await params;
    redirect(`/login?next=${encodeURIComponent(`/account/internships/${enrollmentId}`)}`);
  }

  const [{ enrollmentId }, { enrolled }] = await Promise.all([params, searchParams]);
  const service = createPrivilegedAppwriteClient();
  if (!service) {
    throw new Error("Internship workspace is not fully configured.");
  }
  const { tables } = await getAppwriteResources();
  const enrollmentsTable = tables.enrollments;
  const internshipsTable = tables.internships;
  const tasksTable = tables.tasks;
  const submissionsTable = tables.submissions;
  const reviewsTable = tables.reviews;
  const documentsTable = tables.documents;
  const paymentsTable = tables.payments;

  let enrollment: Record<string, unknown>;
  try {
    enrollment = await service.tablesDB.getRow({
      databaseId: service.databaseId,
      tableId: enrollmentsTable,
      rowId: enrollmentId,
    }) as Record<string, unknown>;
  } catch {
    notFound();
  }

  // Security check: ensure student owns this enrollment
  if (String(enrollment.studentId) !== session.user.$id) {
    notFound();
  }

  const internshipId = String(enrollment.internshipId);

  // Load related resources in parallel
  const [internshipResult, taskResults, submissionResults, reviewResults, documentResults, paymentResults, paymentSettings] =
    await Promise.all([
      service.tablesDB.getRow({
        databaseId: service.databaseId,
        tableId: internshipsTable,
        rowId: internshipId,
      }).catch(() => null),

      service.tablesDB.listRows({
        databaseId: service.databaseId,
        tableId: tasksTable,
        queries: [
          Query.equal("internshipId", internshipId),
          Query.equal("isPublished", true),
          Query.orderAsc("sequence"),
          Query.limit(20),
        ],
      }).catch(() => ({ rows: [] })),

      submissionsTable
        ? service.tablesDB.listRows({
            databaseId: service.databaseId,
            tableId: submissionsTable,
            queries: [
              Query.equal("enrollmentId", enrollmentId),
              Query.orderDesc("$createdAt"),
              Query.limit(10),
            ],
          }).catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),

      reviewsTable
        ? service.tablesDB.listRows({
            databaseId: service.databaseId,
            tableId: reviewsTable,
            queries: [Query.orderDesc("reviewedAt"), Query.limit(50)],
          }).catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),

      documentsTable
        ? service.tablesDB.listRows({
            databaseId: service.databaseId,
            tableId: documentsTable,
            queries: [
              Query.equal("studentId", session.user.$id),
              Query.limit(50),
            ],
          }).catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),

      paymentsTable
        ? service.tablesDB.listRows({
            databaseId: service.databaseId,
            tableId: paymentsTable,
            queries: [
              Query.equal("enrollmentId", enrollmentId),
              Query.limit(1),
            ],
          }).catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),

      readPaymentSettings(),
    ]);

  const internship = (internshipResult ?? {}) as Record<string, unknown>;
  const tasks = taskResults.rows;
  const submissions = submissionResults.rows;
  const reviews = reviewResults.rows;
  const documents = documentResults.rows as (typeof documentResults.rows[number] & {
    $id: string;
    documentType: string;
    documentTitle: string;
    issueDate: string;
    status: string;
    sourceId?: string;
    internshipId?: string;
  })[];
  let payment = paymentResults.rows[0] as Record<string, unknown> | undefined;
  if (!payment && paymentsTable) {
    payment = await service.tablesDB.createRow({
      databaseId: service.databaseId,
      tableId: paymentsTable,
      rowId: ID.unique(),
      data: {
        studentId: session.user.$id,
        applicationId: String(enrollment.applicationId ?? ""),
        enrollmentId,
        amountDue: paymentSettings.feeAmount,
        currency: "INR",
        paymentInstructions: paymentSettings.instructions || "Complete the UPI payment using the Google Form scanner and submit your transaction reference below for verification.",
        status: "pending",
        transactionReference: null,
        proofFileId: null,
        verificationReason: null,
        verifiedBy: null,
        verifiedAt: null,
        createdBy: "system",
        createdAt: new Date().toISOString(),
      },
      permissions: [Permission.read(Role.user(session.user.$id))],
    }).catch(() => undefined) as Record<string, unknown> | undefined;
  }

  // Active / latest submission
  const latestSubmission = submissions[0] as Record<string, unknown> | undefined;
  const latestReview = latestSubmission
    ? reviews.find((r) => r.submissionId === latestSubmission.$id) as Record<string, unknown> | undefined
    : undefined;

  const primaryTask = tasks[0];

  // Parse files from latest submission
  let submittedFiles: { id: string; name: string }[] = [];
  if (latestSubmission?.fileNames) {
    try {
      submittedFiles = JSON.parse(String(latestSubmission.fileNames));
    } catch {
      submittedFiles = [];
    }
  }

  // Documents matching this enrollment
  const offerDoc = documents.find((doc) =>
    doc.documentType === "offer" &&
    (doc.sourceId === enrollment.applicationId || doc.internshipId === internshipId) &&
    doc.status === "valid"
  );

  const internshipCertDoc = documents.find((doc) =>
    doc.documentType === "internship_completion" &&
    (doc.sourceId === enrollmentId || doc.internshipId === internshipId) &&
    doc.status === "valid"
  );

  const projectCertDoc = documents.find((doc) =>
    doc.documentType === "project_completion" &&
    (doc.internshipId === internshipId || (latestSubmission && doc.sourceId === latestSubmission.$id)) &&
    doc.status === "valid"
  );

  // Overall progress calculation
  const isApproved = latestSubmission?.status === "approved" || Boolean(internshipCertDoc && projectCertDoc);
  const isSubmitted = latestSubmission?.status === "submitted" || latestSubmission?.status === "under_review";
  const isRevision = latestSubmission?.status === "revision_required";
  const isRejected = latestSubmission?.status === "rejected";

  const statusLabel = isApproved
    ? "Certificates Available"
    : isRevision
      ? "Revision Required"
      : isSubmitted
        ? "Under Admin Review"
        : isRejected
          ? "Rejected"
          : "Project Not Submitted";

  const paymentStatus = payment ? String(payment.status) : "not_applicable";
  const paymentVerified = ["verified", "waived", "not_applicable"].includes(paymentStatus);

  return (
    <main className="min-h-[75vh] bg-[#F7F9FC] px-5 py-8 transition-colors duration-200 dark:bg-[#0B1220] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1769D2] dark:text-slate-400 dark:hover:text-[#2575E6]"
        >
          <ArrowLeft size={16} /> Back to My Internships
        </Link>

        {enrolled === "1" && (
          <div role="status" className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles size={20} className="text-emerald-600 shrink-0 dark:text-emerald-400" />
            <span>Enrollment Successful! Your 1-Month internship is active and your Offer Letter is ready below.</span>
          </div>
        )}

        {/* Header Card */}
        <div className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32] sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#1769D2] dark:text-[#2575E6]">Internship Workspace</p>
              <h1 className="mt-2 text-2xl font-bold text-[#101D35] dark:text-[#F1F5FB] sm:text-3xl">
                {String(internship.title ?? "Internship Program")}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-[#A8B5C8]">
                {String(internship.domain ?? "")} · Exactly 1 Month Calendar Duration
              </p>
              <p className="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">Enrollment ID: {enrollmentId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:border dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                Active Internship
              </span>
              <span
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                  isApproved
                    ? "bg-purple-50 text-[#7655D9] dark:bg-purple-950/50 dark:text-[#8F75E8] dark:border dark:border-purple-800/50"
                    : isRevision
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:border dark:border-amber-800/50"
                      : isSubmitted
                        ? "bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:border dark:border-blue-800/50"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Schedule Dates */}
          <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-[#1C2940]/50 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Start Date</p>
              <p className="mt-1 text-base font-bold text-[#101D35] dark:text-[#F1F5FB]">{formatCrewlineDate(enrollment.startedAt as string)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Planned End Date</p>
              <p className="mt-1 text-base font-bold text-[#101D35] dark:text-[#F1F5FB]">{formatCrewlineDate(enrollment.scheduledEndAt as string)}</p>
            </div>
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/30 sm:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">Final Submission Deadline</p>
              <p className="mt-1 text-base font-bold text-amber-950 dark:text-amber-200">{formatCrewlineDate(enrollment.submissionDeadlineAt as string)}</p>
            </div>
          </div>
        </div>

        {/* SECTION A: OFFER LETTER */}
        <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32] sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1769D2] dark:bg-blue-950/60 dark:text-[#2575E6]">
                <FileText size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#101D35] dark:text-[#F1F5FB]">Offer Letter</h2>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Available
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Official Crewline internship offer document with authorized signature.
                </p>
              </div>
            </div>

            {offerDoc ? (
              <a
                href={`/api/documents/${offerDoc.$id}/download`}
                target="_blank"
                rel="noreferrer"
                className="admin-btn-primary inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70] sm:w-auto"
              >
                <Download size={16} className="text-white" /> Download Offer Letter PDF
              </a>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Clock size={15} className="animate-spin text-[#1769D2]" /> Preparing offer document… Refresh in a moment.
              </div>
            )}
          </div>
        </section>

        {/* SECTION B: TASK PDF & INSTRUCTIONS */}
        <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32] sm:p-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1769D2] dark:text-[#2575E6]">Assigned Tasks</p>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {tasks.length} {tasks.length === 1 ? "task assigned" : "tasks assigned"}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-[#101D35] dark:text-[#F1F5FB]">Internship Tasks & Practical Work</h2>

          {tasks.length > 0 ? (
            <div className="mt-5 space-y-6">
              {tasks.map((task) => {
                const taskData = task as Record<string, unknown>;
                const isMandatory = Boolean(taskData.isMandatory);
                return (
                  <div key={task.$id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-[#1C2940]/40">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase text-[#1769D2] dark:text-[#2575E6]">
                          Task #{String(taskData.sequence ?? 1)}
                        </span>
                        <h3 className="text-lg font-bold text-[#101D35] dark:text-[#F1F5FB]">{String(taskData.title ?? "Project Task")}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {isMandatory && (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                            Required
                          </span>
                        )}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isSubmitted
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : isRevision
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {isApproved ? "Approved" : isSubmitted ? "Submitted" : isRevision ? "Revision Needed" : "Pending"}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-[#A8B5C8]">{String(taskData.instructions ?? "")}</p>

                    {Boolean(taskData.resourceFileId) && (
                      <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                        <a
                          href={`/api/tasks/${encodeURIComponent(task.$id)}/resource`}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-btn-primary inline-flex items-center gap-2 rounded-xl bg-[#1769D2] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#123B70]"
                        >
                          <FileText size={14} className="text-white" /> Open Tasks PDF
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Your domain tasks are being assigned. Check back shortly.</p>
          )}
        </section>

        {/* SECTION D: PROJECT SUBMISSION */}
        <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32] sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1769D2] dark:text-[#2575E6]">Project Submission</p>
              <h2 className="mt-1 text-xl font-bold text-[#101D35] dark:text-[#F1F5FB]">Submit Your Final Project</h2>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                isApproved
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : isSubmitted
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                    : isRevision
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          {/* Revision Banner */}
          {isRevision && latestReview && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">Mentor Revision Feedback</p>
              <p className="mt-2 whitespace-pre-wrap leading-6">{String(latestReview.feedback)}</p>
              <p className="mt-3 text-xs font-medium text-amber-800 dark:text-amber-300">
                Please update your code or submission details below and re-submit for review.
              </p>
            </div>
          )}

          {/* Approved Celebration Banner */}
          {isApproved && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-300">Project Approved!</p>
                <p className="mt-1 leading-6">
                  Your project has been thoroughly reviewed and approved by the Crewline team. Your certificates are now unlocked and ready for download below.
                </p>
                {Boolean(latestReview?.feedback) && (
                  <p className="mt-2 italic text-emerald-800 dark:text-emerald-300">Review feedback: &ldquo;{String(latestReview?.feedback)}&rdquo;</p>
                )}
              </div>
            </div>
          )}

          {/* Submitted Project Details Display */}
          {latestSubmission && !isRevision && (
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-[#1C2940]/40">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Submitted Project Details (v{String(latestSubmission.version)})
              </p>
              <h4 className="mt-2 text-base font-bold text-[#101D35] dark:text-[#F1F5FB]">{String(latestSubmission.projectTitle ?? "Project")}</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-[#A8B5C8]">
                {String(latestSubmission.projectDescription ?? "")}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-xs">
                {Boolean(latestSubmission.repositoryUrl) && (
                  <a
                    href={String(latestSubmission.repositoryUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#1769D2] underline hover:text-[#123B70] dark:text-[#2575E6]"
                  >
                    Open GitHub Repository ↗
                  </a>
                )}
                {Boolean(latestSubmission.liveUrl) && (
                  <a
                    href={String(latestSubmission.liveUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#1769D2] underline hover:text-[#123B70] dark:text-[#2575E6]"
                  >
                    Open Live Demo ↗
                  </a>
                )}
              </div>

              {submittedFiles.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Uploaded Supporting Files:</p>
                  <ul className="mt-1.5 space-y-1">
                    {submittedFiles.map((file) => (
                      <li key={file.id}>
                        <a
                          href={`/api/submissions/${encodeURIComponent(String(latestSubmission.$id))}/files/${encodeURIComponent(file.id)}`}
                          className="text-xs font-medium text-[#1769D2] underline dark:text-[#2575E6]"
                        >
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Submission Form */}
          {primaryTask && (!latestSubmission || isRevision) && (
            <div className="mt-6">
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                Submit your project repository and details below. Once submitted, our team will review your project and verify your payment to unlock your certificates.
              </p>
              <TaskSubmissionForm
                taskId={primaryTask.$id}
                projectTitle={String(latestSubmission?.projectTitle ?? "")}
                projectDescription={String(latestSubmission?.projectDescription ?? "")}
                repositoryUrl={String(latestSubmission?.repositoryUrl ?? "")}
                liveUrl={String(latestSubmission?.liveUrl ?? "")}
                explanation={String(latestSubmission?.explanation ?? "")}
                locked={false}
              />
            </div>
          )}
        </section>

        {/* SECTION D: UPI PAYMENT VIA GOOGLE FORM */}
        {payment && (
          <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1769D2]">Step 2 · Payment Verification</p>
                <h2 className="mt-1 text-xl font-bold text-[#101D35]">UPI Payment via Google Form</h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  paymentVerified
                    ? "bg-emerald-100 text-emerald-800"
                    : paymentStatus === "submitted"
                      ? "bg-blue-100 text-blue-800"
                      : paymentStatus === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                }`}
              >
                {paymentVerified
                  ? "Payment Verified"
                  : paymentStatus === "submitted"
                    ? "Verification Requested (Under Review)"
                    : paymentStatus === "rejected"
                      ? "Payment Rejected — Retry"
                      : "Payment Pending"}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm dark:border-slate-800 dark:bg-[#1C2940]/50">
              <p className="font-semibold text-[#101D35] dark:text-[#F1F5FB]">
                {payment.amountDue || paymentSettings.feeAmount
                  ? `${String(payment.currency ?? "INR")} ${String(payment.amountDue ?? paymentSettings.feeAmount)}`
                  : "Internship Certification Fee"} · Status: {paymentVerified ? "Verified" : "Pending Admin Approval"}
              </p>
              {(Boolean(payment.paymentInstructions) || Boolean(paymentSettings.instructions)) && (
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600 dark:text-[#A8B5C8]">
                  {String(paymentSettings.instructions || payment.paymentInstructions)}
                </p>
              )}
            </div>

            {!paymentVerified && (
              <PaymentSubmissionForm
                paymentId={String(payment.$id)}
                disabled={false}
                googleFormUrl={paymentSettings.googleFormUrl}
              />
            )}
          </section>
        )}

        {/* SECTION E: CERTIFICATES (LOCKED UNTIL PROJECT APPROVED & PAYMENT VERIFIED) */}
        <section
          className={`mt-8 rounded-3xl border p-6 shadow-sm sm:p-8 ${
            internshipCertDoc
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-slate-200/80 bg-white"
          }`}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  internshipCertDoc ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                {internshipCertDoc ? <ShieldCheck size={22} /> : <Lock size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#101D35]">Internship Completion Certificate</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      internshipCertDoc ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {internshipCertDoc ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {internshipCertDoc
                    ? `Issued on ${formatCrewlineDate(internshipCertDoc.issueDate)}. Verified credential ID: ${internshipCertDoc.$id}`
                    : "LOCKED — Submit your project and complete UPI payment. Unlocks when Admin approves both."}
                </p>
              </div>
            </div>

            {internshipCertDoc ? (
              <a
                href={`/api/documents/${internshipCertDoc.$id}/download`}
                target="_blank"
                rel="noreferrer"
                className="admin-btn-primary inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70] sm:w-auto"
              >
                <Download size={16} className="text-white" /> Download Certificate PDF
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                <Lock size={14} /> Locked until Approval
              </span>
            )}
          </div>
        </section>

        <section
          className={`mt-6 rounded-3xl border p-6 shadow-sm sm:p-8 ${
            projectCertDoc
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-slate-200/80 bg-white"
          }`}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  projectCertDoc ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                {projectCertDoc ? <ShieldCheck size={22} /> : <Lock size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#101D35]">Project Completion Certificate</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      projectCertDoc ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {projectCertDoc ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {projectCertDoc
                    ? `Issued on ${formatCrewlineDate(projectCertDoc.issueDate)}. Verified credential ID: ${projectCertDoc.$id}`
                    : "LOCKED — Submit your project and complete UPI payment. Unlocks when Admin approves both."}
                </p>
              </div>
            </div>

            {projectCertDoc ? (
              <a
                href={`/api/documents/${projectCertDoc.$id}/download`}
                target="_blank"
                rel="noreferrer"
                className="admin-btn-primary inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70] sm:w-auto"
              >
                <Download size={16} className="text-white" /> Download Certificate PDF
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                <Lock size={14} /> Locked until Approval
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
