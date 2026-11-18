"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentSubmissionForm({ paymentId, disabled }: { paymentId: string; disabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/submit`, { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit payment details.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit payment details."); }
    finally { setBusy(false); }
  }
  if (disabled) return null;
  return <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">UPI / transaction reference<input name="transactionReference" required minLength={4} maxLength={180} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Payment proof (optional, PDF/PNG/JPG, max 10 MB)<input name="proof" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700 sm:col-span-2">{error}</p>}<button disabled={busy} className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">{busy ? "Submitting…" : "Submit payment for verification"}</button></form>;
}
