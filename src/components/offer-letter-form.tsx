"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Send } from "lucide-react";

export function OfferLetterForm({ applicationId, defaultDuration, alreadySent }: { applicationId: string; defaultDuration: string; alreadySent: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/offer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send offer email.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send offer email."); }
    finally { setBusy(false); }
  }
  const input = "focus-ring mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-medium text-slate-700">Offer start date<input name="offerStartDate" type="date" required className={input} /></label>
    <label className="text-sm font-medium text-slate-700">Duration<input name="offerDuration" defaultValue={defaultDuration} required maxLength={80} className={input} /></label>
    <label className="text-sm font-medium text-slate-700">Work mode<select name="offerMode" defaultValue="remote" className={input}><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label>
    <label className="text-sm font-medium text-slate-700">Stipend <span className="font-normal text-slate-400">(optional)</span><input name="offerStipend" maxLength={120} className={input} placeholder="Leave blank if not applicable" /></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">WhatsApp link<input name="whatsappLink" type="url" required maxLength={2048} className={input} placeholder="https://chat.whatsapp.com/… or https://wa.me/…" /></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Google Form link <span className="font-normal text-slate-400">(optional)</span><input name="googleFormLink" type="url" maxLength={2048} className={input} placeholder="https://forms.gle/…" /></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Additional offer details <span className="font-normal text-slate-400">(optional)</span><textarea name="offerNotes" rows={4} maxLength={3000} className="focus-ring mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Add any program-specific instructions for the offer email." /></label>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
    {alreadySent ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 sm:col-span-2">Offer email sent. This form is locked to prevent accidental duplicate emails.</p> : <div className="sm:col-span-2"><button disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={16} />}{busy ? "Sending offer email…" : "Save details and send offer"}</button><p className="mt-2 text-xs text-slate-500">This sends to the selected applicant’s account email only.</p></div>}
  </form>;
}
