import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, ClipboardList, Download, FileText, UserRound } from "lucide-react";
import { getSessionUser } from "@/lib/appwrite/session";
import { getStudentData } from "@/lib/student-data";
import { ProfileEditor } from "@/components/profile-editor";
import { TaskSubmissionForm } from "@/components/task-submission-form";
import { PaymentSubmissionForm } from "@/components/payment-submission-form";
import { EmailVerification } from "@/components/email-verification";
import { getStudentDocuments } from "@/lib/documents/student-documents";
import { formatCrewlineDate } from "@/lib/internship-dates";
import { NotificationReadButton } from "@/components/notification-read-button";
import { EnrollmentCelebrationModal } from "@/components/enrollment-celebration-modal";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };
const applicationLabels: Record<string, string> = { pending: "Awaiting review", approved: "Enrolled & Active", rejected: "Not selected", withdrawn: "Withdrawn" };

function dateTime(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "Not set";
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ applied?: string; enrolled?: string }> }) {
  const [session, params] = await Promise.all([getSessionUser(), searchParams]);
  if (!session) redirect("/login?next=%2Faccount");
  const [data, documents] = await Promise.all([getStudentData(session.user.$id), getStudentDocuments(session.user.$id)]);
  const profile = (data.profile ?? { fullName: session.user.name, email: session.user.email }) as Record<string, unknown>;
  const profileDetails: [string, unknown][] = [["Email", session.user.email], ["Phone", profile.phone], ["College", profile.college], ["Course", profile.course], ["Year", profile.currentYear], ["City", profile.city]];

  return (
    <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14">
      <EnrollmentCelebrationModal show={params.enrolled === "1"} />
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Student account</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">Welcome, {String(profile.fullName ?? session.user.name)}</h1>
            <p className="mt-2 text-slate-600">Your applications, internship schedule, projects, payments, and documents.</p>
          </div>
          <Link href="/internships" className="inline-flex w-fit items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            Explore internships <ArrowRight size={16} />
          </Link>
        </header>

        {params.applied === "1" && !params.enrolled && (
          <div role="status" className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            Your application was received and is active in your dashboard.
          </div>
        )}

        <EmailVerification verified={session.user.emailVerification} />

        <div className="mt-9 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-brand"><UserRound size={19} /></span>
              <h2 className="text-lg font-bold text-navy">My profile</h2>
            </div>
            <dl className="mt-5 space-y-4">
              {profileDetails.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-5 border-b border-slate-100 pb-3 text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-medium text-navy">{value ? String(value) : "Not provided yet"}</dd>
                </div>
              ))}
            </dl>
            <details className="mt-6 rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-brand">Edit profile</summary>
              <ProfileEditor profile={profile} email={session.user.email} />
            </details>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-brand"><ClipboardList size={19} /></span>
              <h2 className="text-lg font-bold text-navy">My applications</h2>
            </div>
            {data.applications.length ? (
              <ul className="mt-5 divide-y divide-slate-100">
                {data.applications.map((application) => (
                  <li key={application.id} className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold text-navy">{application.internshipTitle}</p>
                      <p className="mt-1 text-sm text-slate-500">{application.domain} · Enrolled {formatCrewlineDate(application.createdAt)}</p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${application.status === "approved" ? "bg-emerald-50 text-emerald-700" : application.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
                      {applicationLabels[String(application.status)] ?? "Enrolled & Active"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 rounded-xl bg-cloud p-5">
                <p className="text-sm font-medium text-navy">No enrollments yet</p>
                <p className="mt-1 text-sm text-slate-500">Choose an internship to enroll in your first program.</p>
              </div>
            )}
          </section>
        </div>

        {/* Schedule & Active Internship */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Your schedule</p>
          <h2 className="mt-2 text-xl font-bold text-navy">My Internship</h2>
          {data.enrollments.length ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {data.enrollments.map((item) => {
                const ownTasks = data.tasks.filter((task) => task.internshipId === item.internshipId);
                const mandatoryTasks = ownTasks.filter((task) => task.isMandatory);
                const completeTasks = mandatoryTasks.filter((task) => task.submissionStatus === "approved").length;
                const progress = mandatoryTasks.length ? Math.round(completeTasks * 100 / mandatoryTasks.length) : item.status === "completed" ? 100 : 0;
                const daysRemaining = item.daysRemaining;

                return (
                  <article key={item.id} className="rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-navy">{item.internshipTitle}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.domain} · {item.selectedDuration || "Duration not set"} · <span className="capitalize font-medium text-emerald-700">{item.status}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {daysRemaining !== null && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                          </span>
                        )}
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{progress}%</span>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Start Date</dt>
                        <dd className="mt-1 font-medium text-navy">{formatCrewlineDate(item.startedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Planned End Date</dt>
                        <dd className="mt-1 font-medium text-navy">{formatCrewlineDate(item.scheduledEndAt)}</dd>
                      </div>
                      <div className="col-span-2 rounded-lg bg-amber-50 p-3">
                        <dt className="text-xs font-semibold text-amber-900">Final project deadline</dt>
                        <dd className="mt-1 font-semibold text-amber-950">{formatCrewlineDate(item.submissionDeadlineAt)}</dd>
                        {item.originalSubmissionDeadlineAt && item.submissionDeadlineAt !== item.originalSubmissionDeadlineAt && (
                          <p className="mt-1 text-xs text-amber-900">
                            Extended from {formatCrewlineDate(item.originalSubmissionDeadlineAt)}{item.deadlineExtensionReason ? ` · ${item.deadlineExtensionReason}` : ""}
                          </p>
                        )}
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Your active internship schedule and milestone dates will appear here upon enrollment.</p>
          )}
        </section>

        {/* Project Workspace & Tasks */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Project workspace</p>
          <h2 className="mt-2 text-xl font-bold text-navy">My Projects & Tasks</h2>
          {data.tasks.length ? (
            <ol className="mt-4 divide-y divide-slate-100">
              {data.tasks.map((task) => (
                <li key={task.id} className="py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-brand">{task.internshipTitle}</p>
                      <h3 className="mt-1 font-semibold text-navy">{task.title}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${task.submissionStatus === "approved" ? "bg-emerald-50 text-emerald-700" : task.submissionStatus === "late_submission" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
                      {task.submissionStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.instructions}</p>
                  {task.resourceFileId && (
                    <a
                      href={`/api/tasks/${encodeURIComponent(task.id)}/resource`}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-blue-100 transition"
                    >
                      <Download size={14} /> Download Task PDF Resource (v{task.resourceVersion})
                    </a>
                  )}
                  {task.dueAt && <p className="mt-2 text-xs text-slate-500">Task due {dateTime(task.dueAt)}</p>}
                  {task.attachments.length > 0 && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-600">Submitted project files</p>
                      <ul className="mt-2 space-y-1">
                        {task.attachments.map((file) => (
                          <li key={file.id}>
                            <a href={`/api/submissions/${encodeURIComponent(task.submissionId)}/files/${encodeURIComponent(file.id)}`} className="text-sm text-brand underline">
                              {file.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {task.history.length > 0 && (
                    <details className="mt-3 rounded-lg border border-slate-200 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-600">Submission history ({task.history.length})</summary>
                      <ol className="mt-2 space-y-2">
                        {task.history.map((version) => (
                          <li key={version.id} className="rounded-md bg-slate-50 p-2 text-xs">
                            <p className="font-semibold text-navy">Version {version.version} · {version.status.replaceAll("_", " ")} · {dateTime(version.submittedAt)}</p>
                            {version.feedback && <p className="mt-1 text-slate-600">{version.feedback}{version.score !== null && version.score !== undefined ? ` · Score ${version.score}` : ""}</p>}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                  {task.feedback && (
                    <div className="mt-3 rounded-xl bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Latest mentor feedback{task.score !== null && task.score !== undefined ? ` · Score ${task.score}` : ""}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-amber-950">{task.feedback}</p>
                    </div>
                  )}
                  <TaskSubmissionForm taskId={task.id} projectTitle={task.projectTitle} projectDescription={task.projectDescription} repositoryUrl={task.repositoryUrl} liveUrl={task.liveUrl} explanation={task.explanation} locked={["submitted", "under_review", "approved", "rejected", "late_submission"].includes(task.submissionStatus)} />
                </li>
              ))}
            </ol>
          ) : data.enrollments.length > 0 ? (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-5 text-sm">
              <p className="font-semibold text-navy">Domain Task Preparation in Progress</p>
              <p className="mt-1 text-slate-600">Your assigned domain task is being prepared by Crewline mentors. It will appear here shortly with detailed project requirements and downloadable PDF resources.</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Published tasks assigned to your enrollments will appear here.</p>
          )}
        </section>

        {/* Fee status */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Fee status</p>
          <h2 className="mt-2 text-xl font-bold text-navy">My Payment</h2>
          {data.enrollments.length ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.enrollments.map((item) => {
                const payment = item.payment;
                return (
                  <li key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-navy">{item.internshipTitle}</p>
                    {!payment || payment.status === "not_applicable" ? (
                      <p className="mt-2 text-sm text-emerald-700">No payment is currently required.</p>
                    ) : (
                      <>
                        <p className="mt-2 text-sm font-semibold text-navy">{payment.currency} {payment.amountDue ?? "Amount not set"} · {payment.status.replaceAll("_", " ")}</p>
                        {payment.instructions && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{payment.instructions}</p>}
                        {payment.transactionReference && <p className="mt-2 text-xs text-slate-500">Reference: {payment.transactionReference}</p>}
                        {payment.proofFileId && <a className="mt-2 inline-block text-xs font-semibold text-brand underline" href={`/api/payments/${encodeURIComponent(payment.id)}/proof`}>View submitted proof</a>}
                        {payment.verificationReason && <p className="mt-2 text-sm text-amber-900">Admin note: {payment.verificationReason}</p>}
                        <PaymentSubmissionForm paymentId={payment.id} disabled={!["pending", "rejected"].includes(payment.status)} />
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Payment information is shown here only if a disclosed payment request applies.</p>
          )}
        </section>

        {/* Eligibility */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Eligibility</p>
          <h2 className="mt-2 text-xl font-bold text-navy">My Certificates</h2>
          {data.enrollments.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {data.enrollments.map((item) => {
                const required = data.tasks.filter((task) => task.internshipId === item.internshipId && task.isMandatory);
                const allTasksApproved = required.length > 0 && required.every((task) => task.submissionStatus === "approved");
                const paymentAllowed = !item.payment || ["not_applicable", "verified", "waived"].includes(item.payment.status);
                const internshipComplete = item.status === "completed" && Boolean(item.startedAt && item.completedAt) && allTasksApproved && paymentAllowed;
                const approvedProject = data.tasks.some((task) => task.internshipId === item.internshipId && task.submissionStatus === "approved");
                return (
                  <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-navy">{item.internshipTitle}</p>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li className={item.status === "completed" && item.startedAt && item.completedAt ? "text-emerald-700" : "text-slate-600"}>Internship completion: {item.status === "completed" ? "Complete" : "Pending"}</li>
                      <li className={allTasksApproved ? "text-emerald-700" : "text-slate-600"}>Mandatory tasks: {allTasksApproved ? "Approved" : "Pending"}</li>
                      <li className={paymentAllowed ? "text-emerald-700" : "text-slate-600"}>Payment: {paymentAllowed ? "Verified / Not Applicable" : "Pending verification"}</li>
                      <li className="text-slate-600">Admin authorization: {internshipComplete ? "Awaiting admin issuance" : "Pending requirements"}</li>
                      <li className={approvedProject ? "text-emerald-700" : "text-slate-600"}>Project certificate: {approvedProject ? "Project approved" : "Project approval pending"}</li>
                    </ul>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Certificate eligibility is evaluated after you are enrolled and submit your work.</p>
          )}
        </section>

        {/* Notifications */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-brand" />
            <h2 className="text-lg font-bold text-navy">Notifications</h2>
          </div>
          {data.notifications.length ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.notifications.map((notice) => (
                <li key={notice.id} className="py-3">
                  <Link href={notice.targetUrl || "/account"} className="block">
                    <p className={`text-sm ${notice.isRead ? "font-medium text-slate-600" : "font-bold text-navy"}`}>{notice.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notice.body}</p>
                    <time className="mt-1 block text-xs text-slate-400">{dateTime(notice.createdAt)}</time>
                  </Link>
                  <NotificationReadButton notificationId={notice.id} isRead={notice.isRead} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Application, task, review, payment and deadline notices will appear here.</p>
          )}
        </section>

        {/* Documents */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Student documents</p>
          <h2 className="mt-2 text-xl font-bold text-navy">My Documents</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {([["Offer Letters", "offer"], ["Internship Certificates", "internship_completion"], ["Project Certificates", "project_completion"]] as const).map(([category, type]) => {
              const items = documents.filter((document) => document.type === type);
              return (
                <div key={type} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <FileText size={17} className="text-brand" />
                    <h3 className="text-sm font-bold text-navy">{category}</h3>
                  </div>
                  {items.length ? (
                    <ul className="mt-3 space-y-3">
                      {items.map((document) => (
                        <li key={document.id} className="border-t border-slate-100 pt-3">
                          <p className="text-sm font-semibold text-navy">{document.title}</p>
                          <p className="mt-1 break-all text-xs font-mono text-slate-500">{document.id}</p>
                          {document.reissuedFrom && <p className="mt-1 break-all text-xs font-medium text-blue-800">Reissue of {document.reissuedFrom}</p>}
                          <p className="mt-1 text-xs text-slate-500">{formatCrewlineDate(document.issueDate)} · <span className="font-semibold text-emerald-700 capitalize">{document.status}</span></p>
                          {document.status === "valid" ? (
                            <a
                              href={`/api/documents/${encodeURIComponent(document.id)}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-blue-100 transition"
                            >
                              <Download size={13} /> View / download PDF
                            </a>
                          ) : (
                            <span className="mt-2 inline-block text-xs font-semibold text-red-700">Unavailable: {document.status}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-slate-500">No documents issued in this category yet.</p>
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
