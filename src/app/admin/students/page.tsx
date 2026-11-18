import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export const metadata: Metadata = { title: "Students", robots: { index: false, follow: false } };

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; domain?: string }> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fstudents");
  const filters = await searchParams;
  const service = createPrivilegedAppwriteClient();
  const profilesTable = process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID;
  const applicationsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const enrollmentsTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  if (!service || !profilesTable || !applicationsTable || !enrollmentsTable) throw new Error("Student management is not configured.");
  const queries = [Query.orderAsc("fullName"), Query.limit(100)];
  const search = filters.q?.trim().slice(0, 120);
  if (search) queries.push(Query.or([Query.startsWith("fullName", search), Query.startsWith("email", search)]));
  const applicationQueries = filters.domain ? [Query.equal("domain", filters.domain), Query.limit(100)] : [Query.limit(100)];
  const [profiles, applications, enrollments, domains] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: profilesTable, queries }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries: applicationQueries }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries: [Query.limit(100)] }),
  ]);
  const domainOptions = [...new Set(domains.rows.map((row) => String((row as typeof row & Record<string, unknown>).domain ?? "")).filter(Boolean))].sort();
  const allowedStudents = filters.domain ? new Set(applications.rows.map((row) => String((row as typeof row & Record<string, unknown>).studentId))) : null;
  const applicationByStudent = new Map<string, number>();
  for (const row of applications.rows) { const studentId = String((row as typeof row & Record<string, unknown>).studentId); applicationByStudent.set(studentId, (applicationByStudent.get(studentId) ?? 0) + 1); }
  const enrollmentByStudent = new Map<string, number>();
  for (const row of enrollments.rows) { const studentId = String((row as typeof row & Record<string, unknown>).studentId); enrollmentByStudent.set(studentId, (enrollmentByStudent.get(studentId) ?? 0) + 1); }
  const visible = profiles.rows.filter((row) => !allowedStudents || allowedStudents.has(String((row as typeof row & Record<string, unknown>).authUserId)));
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-brand">Student records</p><h1 className="mt-2 text-3xl font-bold text-navy">Students</h1><p className="mt-2 text-sm text-slate-600">Showing {visible.length} student profiles from the current page of Appwrite records.</p><form className="mt-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4"><input name="q" defaultValue={filters.q} maxLength={120} placeholder="Search name/email from start" className="focus-ring min-h-10 rounded-lg border border-slate-200 px-3 text-sm"/><select name="domain" defaultValue={filters.domain ?? ""} className="focus-ring min-h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All domains</option>{domainOptions.map((domain) => <option key={domain}>{domain}</option>)}</select><button className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white">Filter</button></form><div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{visible.map((row) => {const profile = row as typeof row & Record<string, unknown>; const id = String(profile.authUserId); return <article key={row.$id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1.2fr_1fr_.7fr_.7fr_auto] md:items-center"><div><p className="font-semibold text-navy">{String(profile.fullName ?? "Student")}</p><p className="text-xs text-slate-500">{id}</p></div><p className="text-sm text-slate-600">{String(profile.email ?? "")}</p><p className="text-sm text-slate-600">{String(profile.college ?? "Not provided")}</p><p className="text-sm text-slate-600">Applications: {applicationByStudent.get(id) ?? 0}</p><p className="text-sm text-slate-600">Enrollments: {enrollmentByStudent.get(id) ?? 0}</p><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${profile.profileStatus === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{String(profile.profileStatus ?? "unknown")}</span></article>;})}{!visible.length && <p className="p-6 text-sm text-slate-500">No student profiles match these filters.</p>}</div></div></div></main>;
}
