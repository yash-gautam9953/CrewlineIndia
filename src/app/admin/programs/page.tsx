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
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link><h1 className="mt-4 text-3xl font-bold text-navy">Manage internships</h1><p className="mt-2 text-slate-600">Create and publish programs for student applications.</p>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="mb-6 text-lg font-bold text-navy">Create internship</h2><AdminProgramForm /></section>
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-6"><h2 className="text-lg font-bold text-navy">Existing programs</h2></div>{programs.rows.length ? <div className="divide-y divide-slate-100">{programs.rows.map((row) => {const program = row as typeof row & Record<string, unknown>; return <div key={row.$id} className="flex flex-col justify-between gap-2 px-6 py-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-navy">{String(program.title)}</p><p className="mt-1 text-sm text-slate-500">{String(program.domain)} · {String(program.duration)}</p></div><div className="flex items-center gap-3"><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${program.publicationStatus === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{String(program.publicationStatus)}</span><Link href={`/admin/programs/${row.$id}/tasks`} className="text-sm font-semibold text-brand hover:underline">Manage tasks</Link></div></div>;})}</div> : <p className="p-6 text-sm text-slate-500">No internship programs yet.</p>}</section>
  </div></main>;
}
