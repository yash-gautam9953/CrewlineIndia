"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminPaymentReviewForm({ paymentId, status }: { paymentId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`/api/admin/payments/${encodeURIComponent(paymentId)}/verify`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: form.get("status"), reason: form.get("reason") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update payment.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update payment."); }
    finally { setBusy(false); }
  }
  if (!["pending", "submitted"].includes(status)) return null;
  return <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]"><label className="text-xs font-semibold text-slate-600">Decision<select name="status" className="focus-ring mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="verified">Verify</option><option value="rejected">Reject proof</option><option value="waived">Waive requirement</option></select></label><label className="text-xs font-semibold text-slate-600">Reason if rejecting or waiving<textarea name="reason" maxLength={2000} rows={2} className="focus-ring mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><button disabled={busy} className="self-end rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save decision"}</button>{error && <p role="alert" className="text-xs text-red-700 sm:col-span-3">{error}</p>}</form>;
}
