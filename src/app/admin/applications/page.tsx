import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export const metadata: Metadata = { title: "Applications", robots: { index: false, follow: false } };
type Params = { domain?: string; duration?: string; status?: string; q?: string; page?: string };
function pageLink(params: Params, page: number) {
  const query = new URLSearchParams();
  for (const key of ["domain", "duration", "status", "q"] as const) if (params[key]) query.set(key, params[key]!);
  query.set("page", String(page));
  return `/admin/applications?${query.toString()}`;
}

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fapplications");
  const filters = await searchParams;
  const service = createPrivilegedAppwriteClient();
  const applicationsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const internshipsTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  if (!service || !applicationsTable || !internshipsTable) throw new Error("Application tables are not configured.");
  const page = Math.max(1, Math.min(10000, Number.parseInt(filters.page ?? "1", 10) || 1));
  const pageSize = 25;
  const queries = [Query.orderDesc("$createdAt"), Query.limit(pageSize), Query.offset((page - 1) * pageSize)];
  if (filters.domain) queries.push(Query.equal("domain", filters.domain));
  if (["1 Month", "2 Months", "3 Months"].includes(filters.duration ?? "")) queries.push(Query.equal("selectedDuration", filters.duration!));
  if (["pending", "approved", "rejected", "withdrawn"].includes(filters.status ?? "")) queries.push(Query.equal("status", filters.status!));
  const search = filters.q?.trim().slice(0, 120);
  if (search) queries.push(Query.or([Query.startsWith("studentName", search), Query.startsWith("studentEmail", search)]));
  const [applications, programs, domains] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: internshipsTable, queries: [Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries: [Query.limit(100)] }),
  ]);
  const programById = new Map(programs.rows.map((row) => [row.$id, row as typeof row & Record<string, unknown>]));
  const domainOptions = [...new Set(domains.rows.map((row) => String((row as typeof row & Record<string, unknown>).domain ?? "")).filter(Boolean))].sort();
  const pageCount = Math.max(1, Math.ceil(applications.total / pageSize));
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl">
    <Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link><h1 className="mt-4 text-3xl font-bold text-navy">Applications</h1><p className="mt-2 text-slate-600">{applications.total} matching applications · page {page} of {pageCount}</p>
    <form className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-semibold text-slate-600">Search name/email<input name="q" defaultValue={filters.q} maxLength={120} placeholder="Search from beginning…" className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Domain<select name="domain" defaultValue={filters.domain ?? ""} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All domains</option>{domainOptions.map((domain) => <option key={domain}>{domain}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Duration<select name="duration" defaultValue={filters.duration ?? ""} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All durations</option><option>1 Month</option><option>2 Months</option><option>3 Months</option></select></label>
      <label className="text-xs font-semibold text-slate-600">Status<select name="status" defaultValue={filters.status ?? ""} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option></select></label>
      <button className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700"><Search size={15} />Apply filters</button>
    </form>
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="hidden grid-cols-[1.25fr_1fr_.7fr_.9fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"><span>Student</span><span>Internship</span><span>Duration</span><span>Requested dates</span><span>Status</span><span /></div>{applications.rows.length ? applications.rows.map((row) => {const application = row as typeof row & Record<string, unknown>; const program = programById.get(String(application.internshipId)); const start = typeof application.requestedStartDate === "string" ? new Date(application.requestedStartDate).toLocaleDateString("en-IN", { timeZone: "UTC" }) : "Not set"; const end = typeof application.proposedEndDate === "string" ? new Date(application.proposedEndDate).toLocaleDateString("en-IN", { timeZone: "UTC" }) : "Not set"; return <Link key={row.$id} href={`/admin/applications/${row.$id}`} className="grid gap-2 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1.25fr_1fr_.7fr_.9fr_1fr_auto] md:items-center md:gap-4"><span><b className="block text-sm text-navy">{String(application.studentName ?? "Student")}</b><small className="text-slate-500">{String(application.studentEmail ?? "")}</small></span><span className="text-sm text-slate-600">{String(program?.domain ?? application.domain ?? "Program")}<small className="block text-slate-500">{String(program?.title ?? "Internship")}</small></span><span className="text-sm text-slate-600">{String(application.selectedDuration ?? "—")}</span><span className="text-sm text-slate-600">{start}<small className="block text-slate-500">to {end}</small></span><span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{String(application.status ?? "pending")}</span><ArrowRight size={16} className="hidden text-brand md:block" /></Link>;}) : <p className="p-8 text-sm text-slate-500">No matching applications. Clear filters or wait for students to apply.</p>}</div>
    <div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-500">Showing {applications.rows.length} of {applications.total}. Search matches the start of a name or email.</span><div className="flex gap-2"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={pageLink(filters, Math.max(1, page - 1))} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-brand"}`}>Previous</Link><Link aria-disabled={page >= pageCount} tabIndex={page >= pageCount ? -1 : undefined} href={pageLink(filters, Math.min(pageCount, page + 1))} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page >= pageCount ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-brand"}`}>Next</Link></div></div>
  </div></main>;
}
