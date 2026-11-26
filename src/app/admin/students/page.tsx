import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";

export const metadata: Metadata = { title: "Students", robots: { index: false, follow: false } };

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; domain?: string; page?: string }> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fstudents");
  const filters = await searchParams;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const pageSize = 25;
  const service = createPrivilegedAppwriteClient();
  if (!service) throw new Error("Student management is not configured.");
  const { tables } = await getAppwriteResources();
  const profilesTable = tables.studentProfiles;
  const applicationsTable = tables.applications;
  const enrollmentsTable = tables.enrollments;
  const queries = [Query.orderAsc("fullName"), Query.limit(pageSize), Query.offset((page - 1) * pageSize)];
  const search = filters.q?.trim().slice(0, 120);
  if (search) queries.push(Query.or([Query.startsWith("fullName", search), Query.startsWith("email", search)]));
  const applicationQueries = filters.domain ? [Query.equal("domain", filters.domain), Query.limit(100)] : [Query.limit(100)];
  const [profiles, applications, enrollments, domains] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: profilesTable, queries }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries: applicationQueries }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries: [Query.limit(100)] }),
  ]);
  const totalPages = Math.max(1, Math.ceil(profiles.total / pageSize));
  const domainOptions = [...new Set(domains.rows.map((row) => String((row as typeof row & Record<string, unknown>).domain ?? "")).filter(Boolean))].sort();
  const allowedStudents = filters.domain ? new Set(applications.rows.map((row) => String((row as typeof row & Record<string, unknown>).studentId))) : null;
  const applicationByStudent = new Map<string, number>();
  for (const row of applications.rows) { const studentId = String((row as typeof row & Record<string, unknown>).studentId); applicationByStudent.set(studentId, (applicationByStudent.get(studentId) ?? 0) + 1); }
  const enrollmentByStudent = new Map<string, number>();
  for (const row of enrollments.rows) { const studentId = String((row as typeof row & Record<string, unknown>).studentId); enrollmentByStudent.set(studentId, (enrollmentByStudent.get(studentId) ?? 0) + 1); }
  const visible = profiles.rows.filter((row) => !allowedStudents || allowedStudents.has(String((row as typeof row & Record<string, unknown>).authUserId)));
  return <main className="min-h-[70vh] bg-cloud dark:bg-[#0B1220] px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-semibold text-brand dark:text-blue-400">← Admin overview</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-brand">Student records</p><h1 className="mt-2 text-3xl font-bold text-navy dark:text-[#F1F5FB]">Students</h1><p className="mt-2 text-sm text-slate-600 dark:text-[#A8B5C8]">Showing {visible.length} student profiles · page {page} of {totalPages} ({profiles.total} total).</p><form className="mt-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#151F32]"><input name="q" defaultValue={filters.q} maxLength={120} placeholder="Search name/email from start" className="focus-ring min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"/><select name="domain" defaultValue={filters.domain ?? ""} className="focus-ring min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"><option value="">All domains</option>{domainOptions.map((domain) => <option key={domain}>{domain}</option>)}</select><button className="admin-btn-primary min-h-10 rounded-lg bg-[#1769D2] px-4 text-sm font-semibold text-white border-transparent hover:bg-[#123B70]">Filter</button></form><div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151F32]"><div className="divide-y divide-slate-100 dark:divide-slate-800">{visible.map((row) => {const profile = row as typeof row & Record<string, unknown>; const id = String(profile.authUserId); return <article key={row.$id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1.2fr_1fr_.7fr_.7fr_auto] md:items-center"><div><p className="font-semibold text-navy dark:text-[#F1F5FB]">{String(profile.fullName ?? "Student")}</p><p className="text-xs text-slate-500 dark:text-slate-400">{id}</p></div><p className="text-sm text-slate-600 dark:text-[#A8B5C8]">{String(profile.email ?? "")}</p><p className="text-sm text-slate-600 dark:text-[#A8B5C8]">{String(profile.college ?? "Not provided")}</p><p className="text-sm text-slate-600 dark:text-[#A8B5C8]">Applications: {applicationByStudent.get(id) ?? 0}</p><p className="text-sm text-slate-600 dark:text-[#A8B5C8]">Enrollments: {enrollmentByStudent.get(id) ?? 0}</p><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${profile.profileStatus === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"}`}>{String(profile.profileStatus ?? "unknown")}</span></article>;})}{!visible.length && <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No student profiles match these filters.</p>}</div></div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-500">Page {page} of {totalPages}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} href={`/admin/students?page=${Math.max(1, page - 1)}${filters.q ? `&q=${encodeURIComponent(filters.q)}` : ""}${filters.domain ? `&domain=${encodeURIComponent(filters.domain)}` : ""}`} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-brand"}`}>Previous</Link><Link aria-disabled={page >= totalPages} href={`/admin/students?page=${Math.min(totalPages, page + 1)}${filters.q ? `&q=${encodeURIComponent(filters.q)}` : ""}${filters.domain ? `&domain=${encodeURIComponent(filters.domain)}` : ""}`} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page >= totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-brand"}`}>Next</Link></div></div></div></main>;
}
