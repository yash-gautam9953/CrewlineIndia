import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Download, FileText, UserRound } from "lucide-react";
import { getSessionUser } from "@/lib/appwrite/session";
import { getStudentData } from "@/lib/student-data";
import { ProfileEditor } from "@/components/profile-editor";
import { getStudentDocuments } from "@/lib/documents/student-documents";
import { formatCrewlineDate } from "@/lib/internship-dates";
import { EnrollmentCelebrationModal } from "@/components/enrollment-celebration-modal";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

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
    <main className="min-h-[70vh] bg-[#F7F9FC] px-4 py-8 dark:bg-[#0B1220] sm:px-8 sm:py-12">
      <EnrollmentCelebrationModal show={params.enrolled === "1"} />
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#1769D2] dark:text-blue-400">Student workspace</p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-[#101D35] dark:text-[#F1F5FB] sm:text-4xl">
              Welcome, {String(profile.fullName ?? session.user.name)}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#A8B5C8]">
              Open your internship below to download your Offer Letter, submit your project, complete UPI verification, and unlock certificates.
            </p>
          </div>
          <Link
            href="/internships"
            className="admin-btn-primary inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#1769D2] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70] sm:w-fit"
          >
            Explore internships <ArrowRight size={16} className="text-white" />
          </Link>
        </header>

        {/* My Internships Section (Primary Flow Entry) */}
        <section id="internships" className="scroll-mt-28 mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1769D2] dark:text-blue-400">My Internships</p>
          <h2 className="mt-2 text-2xl font-bold text-[#101D35] dark:text-[#F1F5FB]">Active Learning Programs</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-[#A8B5C8]">
            Open an internship to view your Offer Letter, submit your final project, complete UPI verification, and unlock your certificates.
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
                const payStatus = item.payment?.status ?? "pending";
                const payVerified = ["verified", "waived"].includes(payStatus);

                const progressStatus =
                  hasCertificates || (item.status === "completed" && taskStatus === "approved" && payVerified)
                    ? "Certificates Unlocked"
                    : taskStatus === "revision_required"
                      ? "Revision Required"
                      : taskStatus === "submitted" || taskStatus === "under_review"
                        ? "Project Under Review"
                        : taskStatus === "approved"
                          ? "Project Approved"
                          : taskStatus === "rejected"
                            ? "Rejected"
                            : "Project Not Submitted";

                const daysRemaining = item.daysRemaining;

                return (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-[#1C2940] dark:hover:border-blue-700"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#1769D2] dark:text-blue-400">
                            {item.domain || "Internship"}
                          </span>
                          <h3 className="mt-1 break-words text-lg font-bold text-[#101D35] dark:text-[#F1F5FB]">{item.internshipTitle}</h3>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {item.status === "completed" ? "Completed" : "Active"}
                        </span>
                      </div>

                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            progressStatus === "Certificates Unlocked"
                              ? "bg-purple-50 text-[#7655D9] font-bold dark:bg-purple-950/60 dark:text-purple-300"
                              : progressStatus === "Revision Required"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : progressStatus === "Project Under Review" || progressStatus === "Project Approved"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {progressStatus}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            payVerified
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : payStatus === "submitted"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          Payment: {payVerified ? "Verified" : payStatus === "submitted" ? "Verification Requested" : "Pending"}
                        </span>
                        {daysRemaining !== null && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                          </span>
                        )}
                      </div>

                      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#151F32]">
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Start Date</dt>
                          <dd className="mt-1 font-bold text-[#101D35] dark:text-[#F1F5FB]">{formatCrewlineDate(item.startedAt)}</dd>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#151F32]">
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Planned End Date</dt>
                          <dd className="mt-1 font-bold text-[#101D35] dark:text-[#F1F5FB]">{formatCrewlineDate(item.scheduledEndAt)}</dd>
                        </div>
                        <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30 sm:col-span-2">
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
                        Open Internship Workspace <ArrowRight size={16} className="text-white" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center dark:bg-[#1C2940] sm:text-left">
              <p className="font-semibold text-[#101D35] dark:text-[#F1F5FB]">No active internships yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-[#A8B5C8]">
                Explore published internships and apply to unlock your Offer Letter immediately.
              </p>
              <Link href="/internships" className="focus-ring mt-4 inline-flex items-center gap-2 rounded text-sm font-semibold text-[#1769D2] hover:underline dark:text-blue-400">
                Browse available internships →
              </Link>
            </div>
          )}
        </section>

        {/* Documents Quick Access */}
        <section id="documents" className="scroll-mt-28 mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1769D2] dark:text-blue-400">Student documents</p>
          <h2 className="mt-2 text-xl font-bold text-[#101D35] dark:text-[#F1F5FB]">My Documents & Certificates</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {([["Offer Letters", "offer"], ["Internship Certificates", "internship_completion"], ["Project Certificates", "project_completion"]] as const).map(([category, type]) => {
              const items = documents.filter((document) => document.type === type);
              return (
                <div key={type} className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-800 dark:bg-[#1C2940]">
                  <div className="flex items-center gap-2">
                    <FileText size={17} className="text-[#1769D2] dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-[#101D35] dark:text-[#F1F5FB]">{category}</h3>
                  </div>

                  {items.length ? (
                    <ul className="mt-3 space-y-3">
                      {items.map((document) => (
                        <li key={document.id} className="border-t border-slate-100 pt-3 dark:border-slate-800">
                          <p className="text-sm font-semibold text-[#101D35] dark:text-[#F1F5FB]">{document.title}</p>
                          <p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{document.id}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatCrewlineDate(document.issueDate)} ·{" "}
                            <span className="font-semibold text-emerald-700 capitalize dark:text-emerald-400">{document.status}</span>
                          </p>

                          {document.status === "valid" ? (
                            <a
                              href={`/api/documents/${encodeURIComponent(document.id)}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="focus-ring mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-[#EAF3FF] px-3 py-1.5 text-xs font-semibold text-[#123B70] transition hover:bg-blue-100 dark:border-blue-800/60 dark:bg-blue-950/60 dark:text-blue-200 dark:hover:bg-blue-950"
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
                    <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-[#A8B5C8]">
                      {type === "offer"
                        ? "Enroll in an internship to unlock your Offer Letter."
                        : "Locked until your project is approved and payment is verified."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Profile Card */}
        <section id="profile" className="scroll-mt-28 mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1769D2] dark:bg-blue-950/60 dark:text-blue-300">
              <UserRound size={19} />
            </span>
            <h2 className="text-lg font-bold text-[#101D35] dark:text-[#F1F5FB]">My Profile</h2>
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {profileDetails.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 border-b border-slate-100 pb-3 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt className="shrink-0 text-slate-500 dark:text-[#A8B5C8]">{label}</dt>
                <dd className="min-w-0 break-words font-medium text-[#101D35] dark:text-[#F1F5FB] sm:text-right">
                  {value ? String(value) : <span className="text-slate-400 dark:text-slate-500">Not provided</span>}
                </dd>
              </div>
            ))}
          </dl>

          <details className="mt-6 rounded-xl border border-slate-200/80 p-4 dark:border-slate-800 dark:bg-[#1C2940]/40">
            <summary className="cursor-pointer text-sm font-semibold text-[#1769D2] hover:underline dark:text-blue-400">
              Edit profile details
            </summary>
            <ProfileEditor profile={profile} email={session.user.email} />
          </details>
        </section>
      </div>
    </main>
  );
}
