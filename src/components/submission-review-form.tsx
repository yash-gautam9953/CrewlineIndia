"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SubmissionReviewForm({ submissionId, status, maxScore }: { submissionId: string; status: string; maxScore?: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch(`/api/admin/submissions/${encodeURIComponent(submissionId)}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save review.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save review."); }
    finally { setBusy(false); }
  }
  if (["approved", "rejected"].includes(status)) return <p className="mt-3 text-xs font-semibold text-slate-500">Final decision recorded: {status}.</p>;
  return <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px]"><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Feedback<textarea name="feedback" required minLength={5} maxLength={5000} rows={3} className="focus-ring mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Score{typeof maxScore === "number" ? ` (max ${maxScore})` : ""}<input name="score" type="number" min={0} max={typeof maxScore === "number" ? maxScore : 10000} className="focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Decision<select name="decision" defaultValue="approved" className="focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="approved">Approve</option><option value="revision_required">Request revision</option><option value="rejected">Reject</option></select></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700 sm:col-span-2">{error}</p>}<div className="sm:col-span-2"><button disabled={busy} className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? "Saving…" : "Save review"}</button></div></form>;
}
