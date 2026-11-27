import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, FileCheck, Search } from "lucide-react";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { SubmissionReviewForm } from "@/components/submission-review-form";

export const metadata: Metadata = { title: "Project Submissions", robots: { index: false, follow: false } };
type Filters = { domain?: string; status?: string; q?: string; late?: string; from?: string; to?: string; page?: string };

function pageLink(filters: Filters, page: number) {
  const query = new URLSearchParams();
  for (const key of ["domain", "status", "q", "late", "from", "to"] as const) if (filters[key]) query.set(key, filters[key]!);
  query.set("page", String(page));
  return `/admin/submissions?${query.toString()}`;
}

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fsubmissions");
  const filters = await searchParams;
  const service = createPrivilegedAppwriteClient();
  if (!service) throw new Error("Submission review is not configured.");
  const { tables } = await getAppwriteResources();
  const submissionsTable = tables.submissions;
  const tasksTable = tables.tasks;
  const paymentsTable = tables.payments;

  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const pageSize = 25;
  const queries = [Query.orderDesc("submittedAt"), Query.limit(pageSize), Query.offset((page - 1) * pageSize)];

  if (filters.domain) queries.push(Query.equal("domain", filters.domain));
  if (["submitted", "under_review", "revision_required", "approved", "rejected"].includes(filters.status ?? "")) queries.push(Query.equal("status", filters.status!));
  if (filters.late === "yes") queries.push(Query.equal("isLate", true));
  const search = filters.q?.trim().slice(0, 120);
  if (search) queries.push(Query.or([Query.startsWith("studentName", search), Query.startsWith("studentEmail", search)]));
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) queries.push(Query.greaterThanEqual("submittedAt", `${filters.from}T00:00:00.000Z`));
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    const nextDay = new Date(`${filters.to}T00:00:00.000Z`); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    queries.push(Query.lessThan("submittedAt", nextDay.toISOString()));
  }

  const [submissions, tasks, domains, payments] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: tasksTable, queries: [Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.limit(100)] }),
    paymentsTable
      ? service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentsTable, queries: [Query.limit(100)] })
      : Promise.resolve({ rows: [], total: 0 }),
  ]);

  const taskById = new Map(tasks.rows.map((task) => [task.$id, task as typeof task & Record<string, unknown>]));
  const domainOptions = [...new Set(domains.rows.map((row) => String((row as typeof row & Record<string, unknown>).domain ?? "")).filter(Boolean))].sort();
  const paymentByEnrollment = new Map(payments.rows.map((p) => [String((p as Record<string, unknown>).enrollmentId), p as typeof p & Record<string, unknown>]));

  const groups = new Map<string, typeof submissions.rows>();
  for (const row of submissions.rows) {
    const item = row as typeof row & Record<string, unknown>;
    const domain = String(item.domain ?? "Other");
    groups.set(domain, [...(groups.get(domain) ?? []), row]);
  }

  const pages = Math.max(1, Math.ceil(submissions.total / pageSize));

  return (
    <main className="min-h-[70vh] bg-cloud dark:bg-[#0B1220] px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-semibold text-brand dark:text-blue-400">← Admin overview</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-brand">Mentor workspace</p>
        <h1 className="mt-2 text-3xl font-bold text-navy dark:text-[#F1F5FB]">Project Submissions</h1>
        <p className="mt-2 text-slate-600 dark:text-[#A8B5C8]">{submissions.total} matching projects · page {page} of {pages}</p>

        <form className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6 dark:border-slate-800 dark:bg-[#151F32]">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Student name/email
            <input name="q" defaultValue={filters.q} maxLength={120} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]" placeholder="Search from beginning…" />
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Domain
            <select name="domain" defaultValue={filters.domain ?? ""} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]">
              <option value="">All domains</option>
              {domainOptions.map((domain) => <option key={domain}>{domain}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Status
            <select name="status" defaultValue={filters.status ?? ""} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]">
              <option value="">All statuses</option>
              {["submitted", "under_review", "revision_required", "approved", "rejected"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Submitted from
            <input name="from" type="date" defaultValue={filters.from} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]" />
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Submitted to
            <input name="to" type="date" defaultValue={filters.to} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]" />
          </label>
          <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input type="checkbox" name="late" value="yes" defaultChecked={filters.late === "yes"} /> Late only
          </label>
          <button className="admin-btn-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1769D2] px-4 text-sm font-semibold text-white border-transparent hover:bg-[#123B70] lg:col-span-6">
            <Search size={15} className="text-white" />Apply filters
          </button>
        </form>

        {groups.size ? (
          <div className="mt-7 space-y-8">
            {[...groups.entries()].map(([domain, rows]) => (
              <section key={domain}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-navy dark:text-[#F1F5FB]">{domain}</h2>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">{rows.length} on this page</span>
                </div>
                <div className="space-y-6">
                  {rows.map((row) => {
                    const item = row as typeof row & Record<string, unknown>;
                    const task = taskById.get(String(item.taskId));
                    const files = (() => {
                      try { return JSON.parse(String(item.fileNames ?? "[]")) as { id: string; name: string }[]; }
                      catch { return []; }
                    })();

                    const payment = paymentByEnrollment.get(String(item.enrollmentId));
                    const paymentStatus = payment ? String(payment.status) : "not_applicable";
                    const paymentVerified = ["verified", "waived", "not_applicable"].includes(paymentStatus);

                    return (
                      <article key={row.$id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-brand">Task: {String(task?.title ?? "Internship Task")}</span>
                            <h3 className="mt-1 text-xl font-bold text-navy dark:text-[#F1F5FB]">{String(item.projectTitle ?? task?.title ?? "Project Submission")}</h3>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-[#A8B5C8]">
                              <span><strong>Student:</strong> {String(item.studentName ?? "Student")} ({String(item.studentEmail ?? "")})</span>
                              <span><strong>Student ID:</strong> <span className="font-mono">{String(item.studentId)}</span></span>
                              <span><strong>Enrollment ID:</strong> <span className="font-mono">{String(item.enrollmentId)}</span></span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              Submitted {new Date(String(item.submittedAt)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} · Version {String(item.version)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : item.status === "revision_required" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : item.status === "rejected" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"}`}>
                              Review: {String(item.status).replaceAll("_", " ")}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${paymentVerified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"}`}>
                              Payment: {paymentStatus.replaceAll("_", " ")}
                            </span>
                            {Boolean(item.isLate) && (
                              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Late</span>
                            )}
                          </div>
                        </div>

                        {/* Project Description & Links */}
                        <div className="mt-4">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-[#A8B5C8]">{String(item.projectDescription ?? item.explanation ?? "")}</p>

                          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                            {item.repositoryUrl && (
                              <a className="inline-flex items-center gap-1.5 text-brand underline dark:text-blue-400" href={String(item.repositoryUrl)} target="_blank" rel="noreferrer">
                                GitHub Repository <ExternalLink size={14} />
                              </a>
                            )}
                            {item.liveUrl && (
                              <a className="inline-flex items-center gap-1.5 text-brand underline dark:text-blue-400" href={String(item.liveUrl)} target="_blank" rel="noreferrer">
                                Live Demo <ExternalLink size={14} />
                              </a>
                            )}
                          </div>

                          {files.length > 0 && (
                            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#1C2940]">
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Attached Project Files ({files.length}):</p>
                              <ul className="mt-2 space-y-1">
                                {files.map((file) => (
                                  <li key={file.id}>
                                    <a className="text-xs font-semibold text-brand underline dark:text-blue-400" href={`/api/submissions/${encodeURIComponent(row.$id)}/files/${encodeURIComponent(file.id)}`}>
                                      {file.name}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Payment Info & Final Admin Approval */}
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs dark:border-slate-800 dark:bg-[#1C2940]">
                          <div className="flex items-center gap-2">
                            <FileCheck size={16} className={paymentVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
                            <span className="font-semibold text-navy dark:text-[#F1F5FB]">
                              Payment Status: {paymentVerified ? "Verified" : "Pending check (Google Form)"}
                            </span>
                            {payment?.amountDue ? (
                              <span className="text-slate-500 dark:text-[#A8B5C8]">
                                · {String(payment.currency ?? "INR")} {String(payment.amountDue)}
                              </span>
                            ) : null}
                          </div>
                          <Link href="/admin/payments" className="font-semibold text-brand underline dark:text-blue-400">
                            Payment settings
                          </Link>
                        </div>

                        <SubmissionReviewForm
                          submissionId={row.$id}
                          status={String(item.status)}
                          maxScore={typeof task?.maxScore === "number" ? task.maxScore : undefined}
                        />
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#151F32] dark:text-slate-400">
            No matching project submissions.
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Showing {submissions.rows.length} of {submissions.total}; grouped by internship domain.</span>
          <div className="flex gap-2">
            <Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={pageLink(filters, Math.max(1, page - 1))} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600" : "border-slate-200 text-brand dark:border-slate-700 dark:text-blue-400"}`}>
              Previous
            </Link>
            <Link aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} href={pageLink(filters, Math.min(pages, page + 1))} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page >= pages ? "pointer-events-none border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600" : "border-slate-200 text-brand dark:border-slate-700 dark:text-blue-400"}`}>
              Next
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
