import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { SubmissionReviewForm } from "@/components/submission-review-form";

export const metadata: Metadata = { title: "Review project submissions", robots: { index: false, follow: false } };

export default async function AdminSubmissionsPage() {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fsubmissions");
  const service = createPrivilegedAppwriteClient();
  const submissionsTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  const tasksTable = process.env.APPWRITE_TASKS_TABLE_ID;
  if (!service || !submissionsTable || !tasksTable) throw new Error("Submission review is not configured.");
  const submissions = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.orderDesc("submittedAt"), Query.limit(100)] });
  const tasks = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: tasksTable, queries: [Query.limit(100)] });
  const taskById = new Map(tasks.rows.map((task) => [task.$id, task as typeof task & Record<string, unknown>]));
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-5xl"><Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-brand">Mentor workspace</p><h1 className="mt-2 text-3xl font-bold text-navy">Project submissions</h1><p className="mt-2 text-slate-600">Review student work and record feedback, scores and decisions.</p>{submissions.rows.length ? <div className="mt-7 space-y-4">{submissions.rows.map((row) => {const item = row as typeof row & Record<string, unknown>; const task = taskById.get(String(item.taskId)); return <article key={row.$id} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-brand">Task: {String(task?.title ?? "Task")}</p><h2 className="mt-1 text-lg font-bold text-navy">Student {String(item.studentId)}</h2><p className="mt-1 text-xs text-slate-500">Submitted {new Date(String(item.submittedAt)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · Version {String(item.version)}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{String(item.status).replaceAll("_", " ")}</span></div>{item.repositoryUrl && <p className="mt-4 text-sm"><a className="font-semibold text-brand underline" href={String(item.repositoryUrl)} target="_blank" rel="noreferrer">Open repository</a></p>}{item.liveUrl && <p className="mt-2 text-sm"><a className="font-semibold text-brand underline" href={String(item.liveUrl)} target="_blank" rel="noreferrer">Open live project</a></p>}{item.explanation && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{String(item.explanation)}</p>}<SubmissionReviewForm submissionId={row.$id} status={String(item.status)} maxScore={typeof task?.maxScore === "number" ? task.maxScore : undefined} /></article>;})}</div> : <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">No student submissions have been received.</div>}</div></main>;
}
