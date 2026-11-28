"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/http-client";

export function AdminPaymentReviewForm({ paymentId, status }: { paymentId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const submittingRef = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`/api/admin/payments/${encodeURIComponent(paymentId)}/verify`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: form.get("status"), reason: form.get("reason") }) });
      await readApiResponse(response, "Could not update payment.");
      startTransition(() => { router.refresh(); });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update payment."); }
    finally { submittingRef.current = false; setBusy(false); }
  }
  if (!["pending", "submitted"].includes(status)) return null;
  return <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]"><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Decision<select name="status" className="focus-ring mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"><option value="verified">Verify</option><option value="rejected">Reject proof</option><option value="waived">Waive requirement</option></select></label><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reason if rejecting or waiving<textarea name="reason" maxLength={2000} rows={2} className="focus-ring mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]" /></label><button disabled={busy || isRefreshing} className="admin-btn-primary self-end rounded-lg bg-[#1769D2] px-4 py-2 text-xs font-semibold text-white border-transparent hover:bg-[#123B70] disabled:opacity-60">{busy ? "Saving…" : isRefreshing ? "Updating…" : "Save decision"}</button>{error && <p role="alert" className="text-xs text-red-700 dark:text-red-300 sm:col-span-3">{error}</p>}</form>;
}
