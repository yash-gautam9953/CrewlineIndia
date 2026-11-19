"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function PaymentSubmissionForm({ paymentId, disabled }: { paymentId: string; disabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/submit`, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit payment details.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit payment details.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#101D35] transition placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#151F32] dark:text-[#F1F5FB] dark:placeholder:text-slate-500";
  const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300";

  if (disabled) return null;

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3.5 sm:grid-cols-2">
      <label className={labelClass}>
        UPI / Bank transaction reference *
        <input
          name="transactionReference"
          required
          minLength={4}
          maxLength={180}
          className={inputClass}
          placeholder="e.g. UPI/2026/1119/987654"
        />
      </label>

      <label className={labelClass}>
        Payment proof (Optional PDF, PNG, JPG)
        <input
          name="proof"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-[#1769D2]/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#1769D2] hover:file:bg-[#1769D2]/20 dark:file:bg-[#1769D2]/20 dark:file:text-[#2575E6]`}
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 sm:col-span-2"
        >
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="admin-btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70] disabled:opacity-60"
        >
          <CheckCircle2 size={16} className="text-white" />
          {busy ? "Submitting payment details…" : "Submit payment for verification"}
        </button>
      </div>
    </form>
  );
}
