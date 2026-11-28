"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/http-client";
import { Button } from "@/components/ui/button";
import { alertErrorClass, formFileInputClass, formLabelClass } from "@/components/ui/form-controls";

export function TaskResourceReplaceForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const submittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}/resource`, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      await readApiResponse(response, "Could not update task resource.");
      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update task resource.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring mt-2 rounded text-xs font-semibold text-[#1769D2] underline dark:text-blue-400"
      >
        Replace PDF resource
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#1C2940]">
      <label className={formLabelClass}>
        New PDF resource
        <input name="resource" type="file" required accept="application/pdf,.pdf" className={formFileInputClass} />
      </label>
      {error && <p role="alert" className={alertErrorClass}>{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm" loading={busy || isRefreshing}>
          {busy ? "Uploading…" : isRefreshing ? "Updating…" : "Upload new version"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy || isRefreshing} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
