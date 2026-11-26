import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { AdminTaskForm } from "@/components/admin-task-form";
import { TaskResourceReplaceForm } from "@/components/task-resource-replace-form";
import { AdminTaskActions } from "@/components/admin-task-actions";

export const metadata: Metadata = { title: "Manage internship tasks", robots: { index: false, follow: false } };

export default async function InternshipTasksPage({ params }: { params: Promise<{ internshipId: string }> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fprograms");
  const { internshipId } = await params;
  const service = createPrivilegedAppwriteClient();
  if (!service) throw new Error("Task management is not configured.");
  const { tables } = await getAppwriteResources();
  const programTable = tables.internships;
  const tasksTable = tables.tasks;
  const resourcesTable = tables.taskResources;
  const enrollmentTable = tables.enrollments;
  const profilesTable = tables.studentProfiles;
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
  return <main className="min-h-[70vh] bg-cloud dark:bg-[#0B1220] px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-5xl"><Link href="/admin/programs" className="text-sm font-semibold text-brand dark:text-blue-400">← Manage internships</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-brand">Task plan</p><h1 className="mt-2 text-3xl font-bold text-navy dark:text-[#F1F5FB]">{String(program.title)}</h1><p className="mt-2 text-slate-600 dark:text-[#A8B5C8]">Assign tasks to all active enrollees or selected students. Resources stay private and are served through Crewline.</p><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#151F32]"><h2 className="mb-6 text-lg font-bold text-navy dark:text-[#F1F5FB]">Create task</h2><AdminTaskForm internshipId={internshipId} enrolledStudents={enrolledStudents} /></section><section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151F32]"><h2 className="text-lg font-bold text-navy dark:text-[#F1F5FB]">Tasks ({tasks.total})</h2>{tasks.rows.length ? <ol className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{tasks.rows.map((task) => {const versions = resourcesByTask.get(task.$id) ?? []; return <li key={task.$id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-navy dark:text-[#F1F5FB]">{String(task.sequence)}. {String(task.title)}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${task.isPublished ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{task.isPublished ? "Published" : "Draft"}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-[#A8B5C8]">{String(task.instructions)}</p>{task.dueAt && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Due {new Date(String(task.dueAt)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>}{task.resourceFileId && <a href={`/api/tasks/${encodeURIComponent(task.$id)}/resource`} className="mt-2 inline-block text-sm font-semibold text-brand underline dark:text-blue-400">Download current PDF resource · v{String(task.resourceVersion ?? 1)}</a>}{versions.length > 1 && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400">Resource history ({versions.length} versions)</summary><ul className="mt-2 space-y-1">{versions.map((version) => <li key={version.$id} className="text-xs text-slate-500 dark:text-slate-400">v{String(version.version)} · {String(version.resourceFileName)} · uploaded {new Date(String(version.uploadedAt)).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</li>)}</ul></details>}<TaskResourceReplaceForm taskId={task.$id} /><AdminTaskActions taskId={task.$id} title={String(task.title)} instructions={String(task.instructions)} sequence={Number(task.sequence ?? 1)} dueAt={typeof task.dueAt === "string" ? task.dueAt : ""} maxScore={typeof task.maxScore === "number" ? task.maxScore : null} isMandatory={Boolean(task.isMandatory)} isPublished={Boolean(task.isPublished)} /><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Assignment: {String(task.assignmentMode ?? "all_enrolled").replaceAll("_", " ")}</p></li>;})}</ol> : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No tasks created yet.</p>}</section></div></main>;
}
