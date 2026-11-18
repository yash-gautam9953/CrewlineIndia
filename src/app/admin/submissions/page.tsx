import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
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
  const submissionsTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  const tasksTable = process.env.APPWRITE_TASKS_TABLE_ID;
  if (!service || !submissionsTable || !tasksTable) throw new Error("Submission review is not configured.");
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
  const [submissions, tasks, domains] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: tasksTable, queries: [Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.limit(100)] }),
  ]);
  const taskById = new Map(tasks.rows.map((task) => [task.$id, task as typeof task & Record<string, unknown>]));
  const domainOptions = [...new Set(domains.rows.map((row) => String((row as typeof row & Record<string, unknown>).domain ?? "")).filter(Boolean))].sort();
  const groups = new Map<string, typeof submissions.rows>();
  for (const row of submissions.rows) {
    const item = row as typeof row & Record<string, unknown>;
    const domain = String(item.domain ?? "Other");
    groups.set(domain, [...(groups.get(domain) ?? []), row]);
  }
  const pages = Math.max(1, Math.ceil(submissions.total / pageSize));
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-brand">Mentor workspace</p><h1 className="mt-2 text-3xl font-bold text-navy">Project Submissions</h1><p className="mt-2 text-slate-600">{submissions.total} matching projects · page {page} of {pages}</p>
    <form className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"><label className="text-xs font-semibold text-slate-600">Student name/email<input name="q" defaultValue={filters.q} maxLength={120} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Search from beginning…" /></label><label className="text-xs font-semibold text-slate-600">Domain<select name="domain" defaultValue={filters.domain ?? ""} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All domains</option>{domainOptions.map((domain) => <option key={domain}>{domain}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Status<select name="status" defaultValue={filters.status ?? ""} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All statuses</option>{["submitted", "under_review", "revision_required", "approved", "rejected"].map((status) => <option key={status}>{status}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Submitted from<input name="from" type="date" defaultValue={filters.from} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Submitted to<input name="to" type="date" defaultValue={filters.to} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label><label className="flex items-end gap-2 pb-2 text-xs font-semibold text-slate-600"><input type="checkbox" name="late" value="yes" defaultChecked={filters.late === "yes"} /> Late only</label><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700 lg:col-span-6"><Search size={15} />Apply filters</button></form>
    {groups.size ? <div className="mt-7 space-y-8">{[...groups.entries()].map(([domain, rows]) => <section key={domain}><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-navy">{domain}</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{rows.length} on this page</span></div><div className="space-y-4">{rows.map((row) => {const item = row as typeof row & Record<string, unknown>; const task = taskById.get(String(item.taskId)); const files = (() => { try { return JSON.parse(String(item.fileNames ?? "[]")) as {id:string;name:string}[]; } catch { return []; } })(); return <article key={row.$id} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-brand">Task: {String(task?.title ?? "Task")}</p><h3 className="mt-1 text-lg font-bold text-navy">{String(item.projectTitle ?? task?.title ?? "Project")}</h3><p className="mt-1 text-sm text-slate-600">{String(item.studentName ?? "Student")} · {String(item.studentEmail ?? "")}</p><p className="mt-1 text-xs text-slate-500">Submitted {new Date(String(item.submittedAt)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} · Version {String(item.version)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isLate ? "bg-rose-50 text-rose-800" : "bg-blue-50 text-blue-700"}`}>{item.isLate ? "Late submission" : String(item.status).replaceAll("_", " ")}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{String(item.projectDescription ?? item.explanation ?? "")}</p>{item.repositoryUrl && <p className="mt-3 text-sm"><a className="font-semibold text-brand underline" href={String(item.repositoryUrl)} target="_blank" rel="noreferrer">Open repository</a></p>}{item.liveUrl && <p className="mt-2 text-sm"><a className="font-semibold text-brand underline" href={String(item.liveUrl)} target="_blank" rel="noreferrer">Open live project</a></p>}{files.length > 0 && <ul className="mt-3 space-y-1">{files.map((file) => <li key={file.id}><a className="text-sm font-semibold text-brand underline" href={`/api/submissions/${encodeURIComponent(row.$id)}/files/${encodeURIComponent(file.id)}`}>{file.name}</a></li>)}</ul>}<SubmissionReviewForm submissionId={row.$id} status={String(item.status)} maxScore={typeof task?.maxScore === "number" ? task.maxScore : undefined} /></article>;})}</div></section>)}</div> : <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">No matching project submissions.</div>}
    <div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-500">Showing {submissions.rows.length} of {submissions.total}; grouped by internship domain.</span><div className="flex gap-2"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={pageLink(filters, Math.max(1, page - 1))} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-brand"}`}>Previous</Link><Link aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} href={pageLink(filters, Math.min(pages, page + 1))} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page >= pages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-brand"}`}>Next</Link></div></div>
  </div></main>;
}
