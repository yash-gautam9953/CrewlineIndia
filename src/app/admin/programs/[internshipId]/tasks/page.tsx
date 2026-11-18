import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { AdminTaskForm } from "@/components/admin-task-form";
import { TaskResourceReplaceForm } from "@/components/task-resource-replace-form";

export const metadata: Metadata = { title: "Manage internship tasks", robots: { index: false, follow: false } };

export default async function InternshipTasksPage({ params }: { params: Promise<{ internshipId: string }> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fprograms");
  const { internshipId } = await params;
  const service = createPrivilegedAppwriteClient();
  const programTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  const tasksTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const resourcesTable = process.env.APPWRITE_TASK_RESOURCES_TABLE_ID;
  const enrollmentTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const profilesTable = process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID;
  if (!service || !programTable || !tasksTable || !enrollmentTable || !profilesTable || !resourcesTable) throw new Error("Task management is not configured.");
  let program;
  try { program = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: programTable, rowId: internshipId }); }
  catch { notFound(); }
  const [tasks, enrollments] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: tasksTable, queries: [Query.equal("internshipId", internshipId), Query.orderAsc("sequence"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentTable, queries: [Query.equal("internshipId", internshipId), Query.equal("status", "active"), Query.limit(100)] }),
  ]);
  const enrolledStudents = (await Promise.all(enrollments.rows.map(async (enrollment) => {
    const profiles = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: profilesTable, queries: [Query.equal("authUserId", enrollment.studentId), Query.limit(1)] });
    return { id: String(enrollment.studentId), name: String(profiles.rows[0]?.fullName ?? "Student") };
  }))).sort((a, b) => a.name.localeCompare(b.name));
  const resources = tasks.rows.length ? await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: resourcesTable, queries: [Query.equal("taskId", tasks.rows.map((task) => task.$id)), Query.orderDesc("version"), Query.limit(100)] }) : { rows: [], total: 0 };
  const resourcesByTask = new Map<string, typeof resources.rows>();
  for (const row of resources.rows) resourcesByTask.set(String(row.taskId), [...(resourcesByTask.get(String(row.taskId)) ?? []), row]);
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-5xl"><Link href="/admin/programs" className="text-sm font-semibold text-brand">← Manage internships</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-brand">Task plan</p><h1 className="mt-2 text-3xl font-bold text-navy">{String(program.title)}</h1><p className="mt-2 text-slate-600">Assign tasks to all active enrollees or selected students. Resources stay private and are served through Crewline.</p><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="mb-6 text-lg font-bold text-navy">Create task</h2><AdminTaskForm internshipId={internshipId} enrolledStudents={enrolledStudents} /></section><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-navy">Tasks ({tasks.total})</h2>{tasks.rows.length ? <ol className="mt-4 divide-y divide-slate-100">{tasks.rows.map((task) => {const versions = resourcesByTask.get(task.$id) ?? []; return <li key={task.$id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-navy">{String(task.sequence)}. {String(task.title)}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${task.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{task.isPublished ? "Published" : "Draft"}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{String(task.instructions)}</p>{task.dueAt && <p className="mt-2 text-xs text-slate-500">Due {new Date(String(task.dueAt)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>}{task.resourceFileId && <a href={`/api/tasks/${encodeURIComponent(task.$id)}/resource`} className="mt-2 inline-block text-sm font-semibold text-brand underline">Download current PDF resource · v{String(task.resourceVersion ?? 1)}</a>}{versions.length > 1 && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-slate-500">Resource history ({versions.length} versions)</summary><ul className="mt-2 space-y-1">{versions.map((version) => <li key={version.$id} className="text-xs text-slate-500">v{String(version.version)} · {String(version.resourceFileName)} · uploaded {new Date(String(version.uploadedAt)).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</li>)}</ul></details>}<TaskResourceReplaceForm taskId={task.$id} /><p className="mt-1 text-xs text-slate-500">Assignment: {String(task.assignmentMode ?? "all_enrolled").replaceAll("_", " ")}</p></li>;})}</ol> : <p className="mt-4 text-sm text-slate-500">No tasks created yet.</p>}</section></div></main>;
}
