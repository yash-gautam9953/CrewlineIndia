"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload } from "lucide-react";
import { readApiResponse } from "@/lib/http-client";

export function AdminTaskForm({
  internshipId,
}: {
  internshipId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const submittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const file = form.get("resource");
      if (!(file instanceof File) || file.size === 0) {
        throw new Error("Please select a Task PDF file.");
      }
      const response = await fetch("/api/admin/tasks", { method: "POST", body: form });
      await readApiResponse(response, "Could not upload Task PDF.");
      formElement.reset();
      setMessage("Task PDF uploaded successfully.");
      startTransition(() => {
        router.refresh();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload Task PDF.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="internshipId" value={internshipId} />
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Task PDF <span className="font-normal text-slate-400">(PDF only, up to 25 MB)</span>
        <input
          name="resource"
          type="file"
          required
          accept="application/pdf,.pdf"
          className="focus-ring mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#1769D2] hover:file:bg-blue-100 dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB] dark:file:bg-blue-950/60 dark:file:text-blue-300"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </p>
      )}
      <button
        disabled={busy || isRefreshing}
        className="admin-btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-semibold text-white border-transparent hover:bg-[#123B70] disabled:opacity-60"
      >
        {busy || isRefreshing ? <LoaderCircle size={16} className="animate-spin text-white" /> : <Upload size={16} className="text-white" />}
        {busy ? "Uploading…" : isRefreshing ? "Updating…" : "Upload Task PDF"}
      </button>
    </form>
  );
}
