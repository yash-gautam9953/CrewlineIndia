"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminTaskForm({ internshipId, enrolledStudents }: { internshipId: string; enrolledStudents: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      if (form.get("dueAt")) form.set("dueAt", new Date(String(form.get("dueAt"))).toISOString());
      const response = await fetch("/api/admin/tasks", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create task.");
      formElement.reset(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create task."); }
    finally { setBusy(false); }
  }
  const input = "focus-ring mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm";
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="internshipId" value={internshipId} />
    <label className="text-sm font-medium text-slate-700">Task title<input name="title" required minLength={3} maxLength={180} className={input} /></label>
    <label className="text-sm font-medium text-slate-700">Order number<input name="sequence" type="number" min={1} required className={input} /></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Instructions<textarea name="instructions" required minLength={10} maxLength={12000} rows={5} className="focus-ring mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
    <label className="text-sm font-medium text-slate-700">Deadline<input name="dueAt" type="datetime-local" className={input} /></label>
    <label className="text-sm font-medium text-slate-700">Maximum score <span className="font-normal text-slate-400">(optional)</span><input name="maxScore" type="number" min={0} max={10000} className={input} /></label>
    <label className="text-sm font-medium text-slate-700">Assign task to<select name="assignmentMode" defaultValue="all_enrolled" className={input}><option value="all_enrolled">All enrolled students</option><option value="selected_students">Selected students</option></select></label>
    {enrolledStudents.length > 0 && <fieldset className="rounded-xl border border-slate-200 p-4 sm:col-span-2"><legend className="px-1 text-sm font-semibold text-slate-700">Selected students (used when assignment is set to selected)</legend><div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">{enrolledStudents.map((student) => <label key={student.id} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="assignedStudentIds" value={student.id} />{student.name}<span className="text-xs text-slate-400">{student.id}</span></label>)}</div></fieldset>}
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Task instruction PDF <span className="font-normal text-slate-400">(optional, up to 25 MB)</span><input name="resource" type="file" accept="application/pdf,.pdf" className={`${input} h-auto py-2`} /></label>
    <div className="flex flex-wrap gap-5 sm:col-span-2"><label className="flex items-center gap-2 text-sm text-slate-700"><input name="isMandatory" type="checkbox" defaultChecked /> Required task</label><label className="flex items-center gap-2 text-sm text-slate-700"><input name="isPublished" type="checkbox" /> Publish to assigned students</label></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
    <div className="sm:col-span-2"><button disabled={busy} className="min-h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? "Saving…" : "Create task"}</button></div>
  </form>;
}
