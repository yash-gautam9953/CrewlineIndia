"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function TaskSubmissionForm({ taskId, projectTitle, projectDescription, repositoryUrl, liveUrl, explanation, locked }: { taskId: string; projectTitle: string; projectDescription: string; repositoryUrl: string; liveUrl: string; explanation: string; locked: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("taskId", taskId);
      const response = await fetch("/api/submissions", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit your work.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit your work."); }
    finally { setBusy(false); }
  }
  const input = "focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm";
  if (locked) return null;
  return <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
    <label className="text-xs font-semibold text-slate-600">Project title<input name="projectTitle" required minLength={2} maxLength={180} defaultValue={projectTitle} className={input} /></label>
    <label className="text-xs font-semibold text-slate-600">GitHub repository URL<input name="repositoryUrl" type="url" defaultValue={repositoryUrl} maxLength={2048} className={input} placeholder="https://github.com/…" /></label>
    <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Project description<textarea name="projectDescription" required minLength={10} maxLength={6000} defaultValue={projectDescription} rows={3} className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Describe your project and its main features." /></label>
    <label className="text-xs font-semibold text-slate-600">Live project URL<input name="liveUrl" type="url" defaultValue={liveUrl} maxLength={2048} className={input} placeholder="https://…" /></label>
    <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Work summary<textarea name="explanation" defaultValue={explanation} maxLength={4000} rows={3} className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Explain what you built and how to review it." /></label>
    <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Project files (PDF, ZIP, PNG, JPG, TXT; max 25 MB total)<input name="projectFiles" type="file" multiple accept=".pdf,.zip,.png,.jpg,.jpeg,.txt" className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700 sm:col-span-2">{error}</p>}
    <div className="sm:col-span-2"><button disabled={busy} className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? "Submitting…" : "Submit work"}</button></div>
  </form>;
}
