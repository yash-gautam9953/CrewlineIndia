"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";

export function ApplicationReviewActions({ applicationId, status, reviewNote = "" }: { applicationId: string; status: string; reviewNote?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState(reviewNote);
  async function review(nextStatus: "approved" | "rejected") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/review`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update application.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update application."); }
    finally { setBusy(false); }
  }
  if (["sent", "draft", "withdrawn"].includes(status)) return null;
  return <div className="mt-6 border-t border-slate-100 pt-5">
    <label className="block text-sm font-medium text-slate-700">Review note or rejection reason <span className="font-normal text-slate-400">(optional)</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={3} className="focus-ring mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy || status === "approved"} onClick={() => review("approved")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}Approve application</button><button type="button" disabled={busy || status === "rejected"} onClick={() => review("rejected")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><X size={16} />Reject application</button></div>
  </div>;
}
