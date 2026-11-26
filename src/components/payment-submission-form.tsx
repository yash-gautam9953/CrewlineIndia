"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, QrCode } from "lucide-react";

export function PaymentSubmissionForm({
  paymentId,
  disabled,
  googleFormUrl = "",
}: {
  paymentId: string;
  disabled: boolean;
  googleFormUrl?: string;
}) {
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
    "focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#101D35] transition placeholder:text-slate-400";
  const labelClass = "block text-xs font-semibold text-slate-700";

  if (disabled) return null;

  return (
    <div className="mt-4 space-y-4">
      {googleFormUrl && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1769D2] text-white">
                <QrCode size={19} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#101D35]">Step 1: Pay via UPI Scanner (Google Form)</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Open the Google Form below, scan the UPI QR code to complete payment, and submit the form.
                </p>
              </div>
            </div>
            <a
              href={googleFormUrl}
              target="_blank"
              rel="noreferrer"
              className="admin-btn-primary inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#123B70]"
            >
              Open Payment Google Form <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:grid-cols-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2">
          {googleFormUrl ? "Step 2: Send Verification Request to Admin" : "Submit Payment Reference for Verification"}
        </p>

        <label className={labelClass}>
          UPI Transaction ID / UTR *
          <input
            name="transactionReference"
            required
            minLength={4}
            maxLength={180}
            className={inputClass}
            placeholder="e.g. 432198765432 or Google Form email"
          />
        </label>

        <label className={labelClass}>
          Payment screenshot (Optional PDF, PNG, JPG)
          <input
            name="proof"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-[#1769D2]/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#1769D2] hover:file:bg-[#1769D2]/20`}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 sm:col-span-2">
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
            {busy ? "Sending verification request…" : "I Have Paid — Request Verification"}
          </button>
        </div>
      </form>
    </div>
  );
}
