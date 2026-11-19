"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

export function TaskSubmissionForm({
  taskId,
  projectTitle,
  projectDescription,
  repositoryUrl,
  liveUrl,
  explanation,
  locked,
}: {
  taskId: string;
  projectTitle: string;
  projectDescription: string;
  repositoryUrl: string;
  liveUrl: string;
  explanation: string;
  locked: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("taskId", taskId);
      const response = await fetch("/api/submissions", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit your work.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit your work.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#101D35] transition placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#151F32] dark:text-[#F1F5FB] dark:placeholder:text-slate-500";
  const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300";

  if (locked) return null;

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-[#1C2940]/60 sm:grid-cols-2">
      <label className={labelClass}>
        Project title *
        <input name="projectTitle" required minLength={2} maxLength={180} defaultValue={projectTitle} className={inputClass} placeholder="e.g. Distributed E-Commerce Architecture" />
      </label>

      <label className={labelClass}>
        GitHub repository URL
        <input name="repositoryUrl" type="url" defaultValue={repositoryUrl} maxLength={2048} className={inputClass} placeholder="https://github.com/username/project" />
      </label>

      <label className={`${labelClass} sm:col-span-2`}>
        Project description *
        <textarea name="projectDescription" required minLength={10} maxLength={6000} defaultValue={projectDescription} rows={3} className={inputClass} placeholder="Describe what your application does, architecture patterns used, and key features." />
      </label>

      <label className={`${labelClass} sm:col-span-2`}>
        Live demo URL (Optional)
        <input name="liveUrl" type="url" defaultValue={liveUrl} maxLength={2048} className={inputClass} placeholder="https://my-project.vercel.app" />
      </label>

      <label className={`${labelClass} sm:col-span-2`}>
        Implementation explanation / Review notes
        <textarea name="explanation" defaultValue={explanation} maxLength={4000} rows={3} className={inputClass} placeholder="Explain how you solved the requirements and any notes for the reviewing mentor." />
      </label>

      <label className={`${labelClass} sm:col-span-2`}>
        Supporting files (ZIP, PDF, images, TXT; max 25 MB)
        <input name="projectFiles" type="file" multiple accept=".pdf,.zip,.png,.jpg,.jpeg,.txt" className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-[#1769D2]/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#1769D2] hover:file:bg-[#1769D2]/20 dark:file:bg-[#1769D2]/20 dark:file:text-[#2575E6]`} />
      </label>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 sm:col-span-2">
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="admin-btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70] disabled:opacity-60"
        >
          <UploadCloud size={16} className="text-white" />
          {busy ? "Submitting project…" : "Submit final project"}
        </button>
      </div>
    </form>
  );
}
