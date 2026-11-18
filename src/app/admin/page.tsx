import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Files, Layers3, Mail } from "lucide-react";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export const metadata: Metadata = { title: "Admin panel", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?next=%2Fadmin");
  const service = createPrivilegedAppwriteClient();
  const applicationsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const internshipsTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  if (!service || !applicationsTable || !internshipsTable) throw new Error("Admin data tables are not configured.");

  const indiaToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const startOfDay = new Date(`${indiaToday}T00:00:00+05:30`).toISOString();
  const [today, recentApplications, programs] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries: [Query.greaterThanEqual("$createdAt", startOfDay), Query.limit(1)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries: [Query.orderDesc("$createdAt"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: internshipsTable, queries: [Query.limit(100)] }),
  ]);
  const programById = new Map(programs.rows.map((row) => [row.$id, row as typeof row & Record<string, unknown>]));
  const domains = [...new Set(programs.rows.map((program) => String((program as typeof program & Record<string, unknown>).domain ?? "Other")))];
  const todayByDomain = await Promise.all(domains.map(async (domain) => {
    const count = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries: [Query.equal("domain", domain), Query.greaterThanEqual("$createdAt", startOfDay), Query.limit(1)] });
    return { name: domain, count: count.total };
  }));
  const todayPrograms = todayByDomain.filter((item) => item.count > 0);

  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-purple">Crewline administration</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">Applications overview</h1><p className="mt-2 text-slate-600">Signed in as {admin.email}</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/students" className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand">Students</Link><Link href="/admin/enrollments" className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand">Enrollments</Link><Link href="/admin/submissions" className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand">Project submissions</Link><Link href="/admin/payments" className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand">Payments</Link><Link href="/admin/notifications" className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand">Notifications</Link><Link href="/admin/documents" className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand">Certificates & documents</Link><Link href="/admin/programs" className="inline-flex w-fit items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-blue-600">Manage internships & tasks <ArrowRight size={16} /></Link></div></div>
    <section className="mt-8 grid gap-4 sm:grid-cols-3">
      {[[CalendarDays, "Applications today", today.total, "bg-blue-50 text-brand"], [Files, "Latest applications", recentApplications.total, "bg-purple-50 text-purple"], [Layers3, "Internship programs", programs.total, "bg-indigo-50 text-indigo-600"]].map(([Icon, label, value, tone]) => {const I = Icon as typeof CalendarDays; return <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label as string}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone as string}`}><I size={18} /></span></div><p className="mt-5 text-3xl font-bold text-navy">{value as number}</p></div>;})}
    </section>
    <section className="mt-7 grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-navy">Today by domain</h2>{todayPrograms.length ? <ul className="mt-4 space-y-3">{todayPrograms.map((item) => <li key={item.name} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-sm"><span className="text-slate-600">{item.name}</span><span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">{item.count}</span></li>)}</ul> : <p className="mt-4 rounded-xl bg-cloud p-4 text-sm text-slate-500">No applications received today.</p>}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-6"><h2 className="text-lg font-bold text-navy">Recent applications</h2><Link href="/admin/applications" className="text-sm font-semibold text-brand">View all</Link></div>{recentApplications.rows.length ? <div className="divide-y divide-slate-100">{recentApplications.rows.slice(0, 10).map((row) => {const application = row as typeof row & Record<string, unknown>; const program = programById.get(String(application.internshipId)); return <Link key={row.$id} href={`/admin/applications/${row.$id}`} className="flex flex-col justify-between gap-2 px-6 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"><div><p className="font-semibold text-navy">{String(application.studentName ?? "Student")}</p><p className="mt-1 text-sm text-slate-500">{String(program?.domain ?? "Program")} · {String(program?.title ?? "Internship")}</p></div><span className="inline-flex items-center gap-2 text-xs font-semibold text-brand"><Mail size={14} /> {application.offerStatus === "sent" ? "Offer sent" : "Review application"}</span></Link>;})}</div> : <p className="p-6 text-sm text-slate-500">No applications yet.</p>}</div>
    </section>
  </div></main>;
}
