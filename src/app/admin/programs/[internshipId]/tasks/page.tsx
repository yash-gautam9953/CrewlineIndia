import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { AdminTaskForm } from "@/components/admin-task-form";

export const metadata: Metadata = { title: "Manage internship tasks", robots: { index: false, follow: false } };

export default async function InternshipTasksPage({ params }: { params: Promise<{ internshipId: string }> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fprograms");
  const { internshipId } = await params;
  const service = createPrivilegedAppwriteClient();
  const programTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  const tasksTable = process.env.APPWRITE_TASKS_TABLE_ID;
  if (!service || !programTable || !tasksTable) throw new Error("Task management is not configured.");
  let program;
  try { program = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: programTable, rowId: internshipId }); }
  catch { notFound(); }
  const tasks = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: tasksTable, queries: [Query.equal("internshipId", internshipId), Query.orderAsc("sequence"), Query.limit(100)] });
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-5xl"><Link href="/admin/programs" className="text-sm font-semibold text-brand">← Manage internships</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-brand">Task plan</p><h1 className="mt-2 text-3xl font-bold text-navy">{String(program.title)}</h1><p className="mt-2 text-slate-600">Tasks published here are visible only to actively enrolled students.</p><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="mb-6 text-lg font-bold text-navy">Create task</h2><AdminTaskForm internshipId={internshipId} /></section><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-navy">Tasks ({tasks.total})</h2>{tasks.rows.length ? <ol className="mt-4 divide-y divide-slate-100">{tasks.rows.map((task) => <li key={task.$id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-navy">{String(task.sequence)}. {String(task.title)}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${task.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{task.isPublished ? "Published" : "Draft"}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{String(task.instructions)}</p>{task.dueAt && <p className="mt-2 text-xs text-slate-500">Due {new Date(String(task.dueAt)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>}</li>)}</ol> : <p className="mt-4 text-sm text-slate-500">No tasks created yet.</p>}</section></div></main>;
}
