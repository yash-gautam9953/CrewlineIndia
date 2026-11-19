import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList, Download, FileText, UserRound } from "lucide-react";
import { getSessionUser } from "@/lib/appwrite/session";
import { getStudentData } from "@/lib/student-data";
import { ProfileEditor } from "@/components/profile-editor";
import { TaskSubmissionForm } from "@/components/task-submission-form";
import { PaymentSubmissionForm } from "@/components/payment-submission-form";
import { EmailVerification } from "@/components/email-verification";
import { getStudentDocuments } from "@/lib/documents/student-documents";
import { formatCrewlineDate } from "@/lib/internship-dates";
import { EnrollmentCelebrationModal } from "@/components/enrollment-celebration-modal";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };
const applicationLabels: Record<string, string> = { pending: "Awaiting review", approved: "Enrolled & Active", rejected: "Not selected", withdrawn: "Withdrawn" };

function dateTime(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "Not set";
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ applied?: string; enrolled?: string }> }) {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Faccount");

  const [data, documents, params] = await Promise.all([
    getStudentData(session.user.$id),
    getStudentDocuments(session.user.$id),
    searchParams,
  ]);

  const profile = data.profile ?? {
    fullName: session.user.name,
    crewlineStudentId: "",
    phone: "",
    college: "",
    course: "",
    currentYear: "",
    city: "",
  };
  const profileDetails = [
    ["Student ID", profile.crewlineStudentId || "Generated automatically on enrollment"],
    ["Phone", profile.phone],
    ["College", profile.college],
    ["Course", profile.course],
    ["Current year", profile.currentYear ? `${profile.currentYear} year` : ""],
    ["City", profile.city],
  ];

  return (
    <main className="min-h-[70vh] bg-[#F7F9FC] px-5 py-10 transition-colors duration-200 dark:bg-[#0B1220] sm:px-8 sm:py-14">
      <EnrollmentCelebrationModal show={params.enrolled === "1"} />
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#1769D2] dark:text-[#2575E6]">Student workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#101D35] dark:text-[#F1F5FB] sm:text-4xl">
              Welcome, {String(profile.fullName ?? session.user.name)}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#A8B5C8]">
              Your active internships, schedules, final projects, payment verification, and verifiable documents.
            </p>
          </div>
          <Link
            href="/internships"
            className="admin-btn-primary inline-flex w-fit items-center gap-2 rounded-full bg-[#1769D2] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70]"
          >
            Explore internships <ArrowRight size={16} />
          </Link>
        </header>

        {params.applied === "1" && !params.enrolled && (
          <div role="status" className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            Your application was received and is active in your dashboard.
          </div>
        )}

        <EmailVerification verified={session.user.emailVerification} />

        {/* Profile and Applications Grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
          {/* Profile Card */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1769D2] dark:bg-blue-950/60 dark:text-[#2575E6]">
                  <UserRound size={19} />
                </span>
                <h2 className="text-lg font-bold text-[#101D35] dark:text-[#F1F5FB]">My Profile</h2>
              </div>
            </div>

            <dl className="mt-5 space-y-3.5">
              {profileDetails.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm dark:border-slate-800/80">
                  <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="text-right font-medium text-[#101D35] dark:text-[#F1F5FB]">
                    {value ? String(value) : <span className="text-slate-400 dark:text-slate-500">Not provided</span>}
                  </dd>
                </div>
              ))}
            </dl>

            <details className="mt-6 rounded-xl border border-slate-200/80 p-4 dark:border-slate-800 dark:bg-[#1C2940]/40">
              <summary className="cursor-pointer text-sm font-semibold text-[#1769D2] hover:underline dark:text-[#2575E6]">
                Edit profile details
              </summary>
              <ProfileEditor profile={profile} email={session.user.email} />
            </details>

            {/* Theme Preference */}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800/80">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Interface Theme</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Sync with system or choose manually</p>
                </div>
                <ThemeToggle variant="segmented" />
              </div>
            </div>
          </section>

          {/* Applications Card */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1769D2] dark:bg-blue-950/60 dark:text-[#2575E6]">
                <ClipboardList size={19} />
              </span>
              <h2 className="text-lg font-bold text-[#101D35] dark:text-[#F1F5FB]">Enrolled Programs</h2>
            </div>

            {data.applications.length ? (
              <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800/80">
                {data.applications.map((application) => (
                  <li key={application.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold text-[#101D35] dark:text-[#F1F5FB]">{application.internshipTitle}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {application.domain} · Enrolled {formatCrewlineDate(application.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        application.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border dark:border-emerald-800/60"
                          : application.status === "rejected"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 dark:border dark:border-rose-800/60"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 dark:border dark:border-blue-800/60"
                      }`}
                    >
                      {applicationLabels[String(application.status)] ?? "Enrolled & Active"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 rounded-xl bg-slate-50 p-5 dark:bg-[#1C2940]">
                <p className="text-sm font-medium text-[#101D35] dark:text-[#F1F5FB]">No enrollments yet</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose an internship to enroll in your first program.</p>
              </div>
            )}
          </section>
        </div>

        {/* My Internships Section */}
        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1769D2] dark:text-[#2575E6]">My Internships</p>
          <h2 className="mt-2 text-2xl font-bold text-[#101D35] dark:text-[#F1F5FB]">Active Learning Programs</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-[#A8B5C8]">
            Access your 1-month internships, offer letters, assigned tasks, and completion certificates.
          </p>

          {data.enrollments.length ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {data.enrollments.map((item) => {
                const ownTasks = data.tasks.filter((task) => task.internshipId === item.internshipId);
                const primaryTask = ownTasks[0];
                const taskStatus = primaryTask?.submissionStatus;
                const hasCertificates = documents.some(
                  (doc) => doc.type === "internship_completion" && doc.status === "valid"
                );

                const progressStatus =
                  hasCertificates || item.status === "completed" || taskStatus === "approved"
                    ? "Certificates Available"
                    : taskStatus === "revision_required"
                      ? "Revision Required"
                      : taskStatus === "submitted" || taskStatus === "under_review"
                        ? "Under Admin Review"
                        : taskStatus === "rejected"
                          ? "Rejected"
                          : "Project Not Submitted";

                const daysRemaining = item.daysRemaining;

                return (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-[#1C2940]/50 dark:hover:border-blue-700"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[#1769D2] dark:text-[#2575E6]">
                            {item.domain || "Internship"}
                          </span>
                          <h3 className="mt-1 text-lg font-bold text-[#101D35] dark:text-[#F1F5FB]">{item.internshipTitle}</h3>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {item.status === "completed" ? "Completed" : "Active Internship"}
                        </span>
                      </div>

                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            progressStatus === "Certificates Available"
                              ? "bg-purple-50 text-[#7655D9] font-bold dark:bg-purple-950/50 dark:text-[#8F75E8] dark:border dark:border-purple-800/50"
                              : progressStatus === "Revision Required"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:border dark:border-amber-800/50"
                                : progressStatus === "Under Admin Review"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:border dark:border-blue-800/50"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          Progress: {progressStatus}
                        </span>
                        {daysRemaining !== null && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                          </span>
                        )}
                      </div>

                      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#151F32]">
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Start Date</dt>
                          <dd className="mt-1 font-bold text-[#101D35] dark:text-[#F1F5FB]">{formatCrewlineDate(item.startedAt)}</dd>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#151F32]">
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Planned End Date</dt>
                          <dd className="mt-1 font-bold text-[#101D35] dark:text-[#F1F5FB]">{formatCrewlineDate(item.scheduledEndAt)}</dd>
                        </div>
                        <div className="col-span-2 rounded-xl border border-amber-200/60 bg-amber-50/70 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/30">
                          <dt className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                            Final Submission Deadline
                          </dt>
                          <dd className="mt-1 font-bold text-amber-950 dark:text-amber-200">{formatCrewlineDate(item.submissionDeadlineAt)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <Link
                        href={`/account/internships/${item.id}`}
                        className="admin-btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70]"
                      >
                        Open Internship <ArrowRight size={16} className="text-white" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center dark:bg-[#1C2940] sm:text-left">
              <p className="font-semibold text-[#101D35] dark:text-[#F1F5FB]">No active enrollments</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Explore published internships and enroll to get your offer letter immediately.
              </p>
              <Link href="/internships" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1769D2] hover:underline dark:text-[#2575E6]">
                Browse available internships →
              </Link>
            </div>
          )}
        </section>

        {/* Project Workspace & Tasks */}
        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1769D2] dark:text-[#2575E6]">Project workspace</p>
          <h2 className="mt-2 text-xl font-bold text-[#101D35] dark:text-[#F1F5FB]">My Projects & Tasks</h2>

          {data.tasks.length ? (
            <ol className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
              {data.tasks.map((task) => (
                <li key={task.id} className="py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#1769D2] dark:text-[#2575E6]">{task.internshipTitle}</p>
                      <h3 className="mt-1 font-semibold text-[#101D35] dark:text-[#F1F5FB]">{task.title}</h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        task.submissionStatus === "approved"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border dark:border-emerald-800/60"
                          : task.submissionStatus === "late_submission"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      }`}
                    >
                      {task.submissionStatus.replaceAll("_", " ")}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-[#A8B5C8]">{task.instructions}</p>

                  {task.resourceFileId && (
                    <a
                      href={`/api/tasks/${encodeURIComponent(task.id)}/resource`}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-[#1769D2] hover:bg-blue-100 transition dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-[#2575E6]"
                    >
                      <Download size={14} /> Download Task PDF Resource (v{task.resourceVersion})
                    </a>
                  )}

                  {task.dueAt && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Task due {dateTime(task.dueAt)}</p>}

                  {task.attachments.length > 0 && (
                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#1C2940]">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Submitted project files</p>
                      <ul className="mt-2 space-y-1">
                        {task.attachments.map((file) => (
                          <li key={file.id}>
                            <a
                              href={`/api/submissions/${encodeURIComponent(task.submissionId)}/files/${encodeURIComponent(file.id)}`}
                              className="text-sm text-[#1769D2] hover:underline dark:text-[#2575E6]"
                            >
                              {file.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {task.history.length > 0 && (
                    <details className="mt-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-800 dark:bg-[#1C2940]/40">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Submission history ({task.history.length})
                      </summary>
                      <ol className="mt-2 space-y-2">
                        {task.history.map((version) => (
                          <li key={version.id} className="rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-[#151F32]">
                            <p className="font-semibold text-[#101D35] dark:text-[#F1F5FB]">
                              Version {version.version} · {version.status.replaceAll("_", " ")} · {dateTime(version.submittedAt)}
                            </p>
                            {version.feedback && (
                              <p className="mt-1 text-slate-600 dark:text-slate-400">
                                {version.feedback}
                                {version.score !== null && version.score !== undefined ? ` · Score ${version.score}` : ""}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}

                  {task.feedback && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-300">
                        Latest mentor feedback
                        {task.score !== null && task.score !== undefined ? ` · Score ${task.score}` : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-amber-950 dark:text-amber-200">{task.feedback}</p>
                    </div>
                  )}

                  <TaskSubmissionForm
                    taskId={task.id}
                    projectTitle={task.projectTitle}
                    projectDescription={task.projectDescription}
                    repositoryUrl={task.repositoryUrl}
                    liveUrl={task.liveUrl}
                    explanation={task.explanation}
                    locked={["submitted", "under_review", "approved", "rejected", "late_submission"].includes(task.submissionStatus)}
                  />
                </li>
              ))}
            </ol>
          ) : data.enrollments.length > 0 ? (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-5 text-sm dark:border-blue-900/40 dark:bg-blue-950/20">
              <p className="font-semibold text-[#101D35] dark:text-[#F1F5FB]">Domain Task Assigned to Your Program</p>
              <p className="mt-1 text-slate-600 dark:text-[#A8B5C8]">
                Your assigned task and resources can be viewed directly in your dedicated internship workspace.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Published tasks assigned to your enrollments will appear here.</p>
          )}
        </section>

        {/* Fee status */}
        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1769D2] dark:text-[#2575E6]">Fee status</p>
          <h2 className="mt-2 text-xl font-bold text-[#101D35] dark:text-[#F1F5FB]">My Payment</h2>

          {data.enrollments.length ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {data.enrollments.map((item) => {
                const payment = item.payment;
                return (
                  <li key={item.id} className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-800 dark:bg-[#1C2940]/40">
                    <p className="font-semibold text-[#101D35] dark:text-[#F1F5FB]">{item.internshipTitle}</p>
                    {!payment || payment.status === "not_applicable" ? (
                      <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">No payment is currently required.</p>
                    ) : (
                      <>
                        <p className="mt-2 text-sm font-semibold text-[#101D35] dark:text-[#F1F5FB]">
                          {payment.currency} {payment.amountDue ?? "Amount not set"} · Status: {payment.status.replaceAll("_", " ")}
                        </p>
                        {payment.instructions && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-[#A8B5C8]">{payment.instructions}</p>
                        )}
                        {payment.transactionReference && (
                          <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">Reference: {payment.transactionReference}</p>
                        )}
                        {payment.proofFileId && (
                          <a className="mt-2 inline-block text-xs font-semibold text-[#1769D2] underline dark:text-[#2575E6]" href={`/api/payments/${encodeURIComponent(payment.id)}/proof`}>
                            View submitted proof
                          </a>
                        )}
                        {payment.verificationReason && (
                          <p className="mt-2 text-sm text-amber-900 dark:text-amber-300">Admin note: {payment.verificationReason}</p>
                        )}
                        <PaymentSubmissionForm paymentId={payment.id} disabled={!["pending", "rejected"].includes(payment.status)} />
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Payment information is shown here only if a disclosed payment request applies.</p>
          )}
        </section>

        {/* Documents */}
        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1769D2] dark:text-[#2575E6]">Student documents</p>
          <h2 className="mt-2 text-xl font-bold text-[#101D35] dark:text-[#F1F5FB]">My Documents</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {([["Offer Letters", "offer"], ["Internship Certificates", "internship_completion"], ["Project Certificates", "project_completion"]] as const).map(([category, type]) => {
              const items = documents.filter((document) => document.type === type);
              return (
                <div key={type} className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-800 dark:bg-[#1C2940]/40">
                  <div className="flex items-center gap-2">
                    <FileText size={17} className="text-[#1769D2] dark:text-[#2575E6]" />
                    <h3 className="text-sm font-bold text-[#101D35] dark:text-[#F1F5FB]">{category}</h3>
                  </div>

                  {items.length ? (
                    <ul className="mt-3 space-y-3">
                      {items.map((document) => (
                        <li key={document.id} className="border-t border-slate-100 pt-3 dark:border-slate-800">
                          <p className="text-sm font-semibold text-[#101D35] dark:text-[#F1F5FB]">{document.title}</p>
                          <p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{document.id}</p>
                          {document.reissuedFrom && (
                            <p className="mt-1 break-all text-xs font-medium text-blue-800 dark:text-blue-300">
                              Reissue of {document.reissuedFrom}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatCrewlineDate(document.issueDate)} ·{" "}
                            <span className="font-semibold text-emerald-700 capitalize dark:text-emerald-400">{document.status}</span>
                          </p>

                          {document.status === "valid" ? (
                            <a
                              href={`/api/documents/${encodeURIComponent(document.id)}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-[#1769D2] hover:bg-blue-100 transition dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-[#2575E6]"
                            >
                              <Download size={13} /> View / download PDF
                            </a>
                          ) : (
                            <span className="mt-2 inline-block text-xs font-semibold text-red-700 dark:text-red-400">Unavailable: {document.status}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">No documents issued in this category yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
