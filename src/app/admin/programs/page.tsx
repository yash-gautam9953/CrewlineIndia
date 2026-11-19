import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { AdminProgramForm } from "@/components/admin-program-form";

export const metadata: Metadata = { title: "Manage internships", robots: { index: false, follow: false } };

export default async function AdminProgramsPage() {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fprograms");
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  if (!service || !tableId) throw new Error("Internship table is not configured.");
  const programs = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.orderDesc("$createdAt"), Query.limit(100)] });
  return <main className="min-h-[70vh] bg-cloud dark:bg-[#0B1220] px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-semibold text-brand dark:text-blue-400">← Admin overview</Link><h1 className="mt-4 text-3xl font-bold text-navy dark:text-[#F1F5FB]">Manage internships</h1><p className="mt-2 text-slate-600 dark:text-[#A8B5C8]">Create and publish programs for student applications.</p>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#151F32]"><h2 className="mb-6 text-lg font-bold text-navy dark:text-[#F1F5FB]">Create internship</h2><AdminProgramForm /></section>
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151F32]"><div className="border-b border-slate-100 p-6 dark:border-slate-800"><h2 className="text-lg font-bold text-navy dark:text-[#F1F5FB]">Existing programs</h2></div>{programs.rows.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{programs.rows.map((row) => {const program = row as typeof row & Record<string, unknown>; return <div key={row.$id} className="flex flex-col justify-between gap-2 px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-[#1C2940] sm:flex-row sm:items-center"><div><p className="font-semibold text-navy dark:text-[#F1F5FB]">{String(program.title)}</p><p className="mt-1 text-sm text-slate-500 dark:text-[#A8B5C8]">{String(program.domain)} · {String(program.duration)}</p></div><div className="flex items-center gap-3"><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${program.publicationStatus === "published" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{String(program.publicationStatus)}</span><Link href={`/admin/programs/${row.$id}/tasks`} className="text-sm font-semibold text-brand hover:underline dark:text-blue-400">Manage tasks</Link></div></div>;})}</div> : <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No internship programs yet.</p>}</section>
  </div></main>;
}
