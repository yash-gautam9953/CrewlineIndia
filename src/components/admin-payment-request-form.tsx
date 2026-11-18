"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminPaymentRequestForm({ enrollmentId, studentName }: { enrollmentId: string; studentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/payments/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enrollmentId, amountDue: form.get("amountDue"), instructions: form.get("instructions") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create payment request.");
      setOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create payment request."); }
    finally { setBusy(false); }
  }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-brand">Create disclosed payment request</button>;
  return <form onSubmit={submit} className="mt-3 grid gap-2"><p className="text-xs text-slate-600">For {studentName}. Only create a request after the fee and terms have been disclosed to the student.</p><label className="text-xs font-semibold text-slate-600">Amount due in INR<input name="amountDue" type="number" min={1} max={100000000} required className="focus-ring mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Payment instructions<textarea name="instructions" required minLength={10} maxLength={2000} rows={3} className="focus-ring mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="UPI ID, due date, and terms already disclosed to the student." /></label>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}<div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white">{busy ? "Saving…" : "Create request"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button></div></form>;
}
