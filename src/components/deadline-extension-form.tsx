"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function DeadlineExtensionForm({ enrollmentId, currentDeadline }: { enrollmentId: string; currentDeadline: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`/api/admin/enrollments/${encodeURIComponent(enrollmentId)}/deadline`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ newDeadline: form.get("newDeadline"), reason: form.get("reason") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not extend deadline.");
      setOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not extend deadline."); }
    finally { setBusy(false); }
  }
  if (!open) return <button type="button" className="mt-2 text-xs font-semibold text-brand underline dark:text-blue-400" onClick={() => setOpen(true)}>Extend deadline</button>;
  return <form onSubmit={submit} className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 dark:bg-[#1C2940]"><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">New deadline<input name="newDeadline" type="date" required min={currentDeadline.slice(0, 10)} className="focus-ring mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy dark:border-slate-700 dark:bg-[#151F32] dark:text-[#F1F5FB]" /></label><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reason<textarea name="reason" required minLength={10} maxLength={2000} rows={2} className="focus-ring mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy dark:border-slate-700 dark:bg-[#151F32] dark:text-[#F1F5FB]" /></label>{error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{error}</p>}<div className="flex gap-2"><button disabled={busy} className="admin-btn-primary rounded-lg bg-[#1769D2] px-3 py-2 text-xs font-semibold text-white border-transparent hover:bg-[#123B70] disabled:opacity-60">{busy ? "Saving…" : "Save extension"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button></div></form>;
}
