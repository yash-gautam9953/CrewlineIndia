import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export const metadata: Metadata = { title: "Applications", robots: { index: false, follow: false } };

export default async function AdminApplicationsPage() {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fapplications");
  const service = createPrivilegedAppwriteClient();
  const applicationsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const internshipsTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  if (!service || !applicationsTable || !internshipsTable) throw new Error("Application tables are not configured.");
  const [applications, programs] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: applicationsTable, queries: [Query.orderDesc("$createdAt"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: internshipsTable, queries: [Query.limit(100)] }),
  ]);
  const programById = new Map(programs.rows.map((row) => [row.$id, row as typeof row & Record<string, unknown>]));
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link><h1 className="mt-4 text-3xl font-bold text-navy">All applications</h1><p className="mt-2 text-slate-600">{applications.total} total applications · showing latest {applications.rows.length}</p><div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"><span>Student</span><span>Program</span><span>Applied</span><span>Status</span><span /></div>{applications.rows.length ? applications.rows.map((row) => {const application = row as typeof row & Record<string, unknown>; const program = programById.get(String(application.internshipId)); return <Link key={row.$id} href={`/admin/applications/${row.$id}`} className="grid gap-2 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-center md:gap-4"><span><b className="block text-sm text-navy">{String(application.studentName ?? "Student")}</b><small className="text-slate-500">{String(application.studentEmail ?? "")}</small></span><span className="text-sm text-slate-600">{String(program?.domain ?? "Program")}<small className="block text-slate-500">{String(program?.title ?? "Internship")}</small></span><span className="text-sm text-slate-600">{new Date(row.$createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span><span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{String(application.offerStatus ?? "not_prepared")}</span><ArrowRight size={16} className="hidden text-brand md:block" /></Link>;}) : <p className="p-8 text-sm text-slate-500">Applications appear here after students apply.</p>}</div></div></main>;
}
