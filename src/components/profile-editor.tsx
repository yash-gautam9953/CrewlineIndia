"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";

export function ProfileEditor({ profile, email }: { profile: Record<string, unknown>; email: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/account/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save your details.");
      setSaved(true); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your details."); }
    finally { setBusy(false); }
  }
  const input = "focus-ring mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy";
  return <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-medium text-slate-700">Full name<input name="fullName" required minLength={2} maxLength={160} defaultValue={String(profile.fullName ?? "")} className={input} /></label>
    <label className="text-sm font-medium text-slate-700">Account email<input value={email} readOnly className={`${input} bg-slate-50 text-slate-500`} /></label>
    <label className="text-sm font-medium text-slate-700">Phone / WhatsApp<input name="phone" maxLength={32} defaultValue={String(profile.phone ?? "")} className={input} /></label>
    <label className="text-sm font-medium text-slate-700">College<input name="college" maxLength={180} defaultValue={String(profile.college ?? "")} className={input} /></label>
    <label className="text-sm font-medium text-slate-700">Course<input name="course" maxLength={160} defaultValue={String(profile.course ?? "")} className={input} /></label>
    <label className="text-sm font-medium text-slate-700">Current year<select name="currentYear" defaultValue={profile.currentYear ? String(profile.currentYear) : ""} className={input}><option value="">Choose year</option>{[1,2,3,4,5,6,7,8].map((year) => <option key={year} value={year}>{year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">City<input name="city" maxLength={120} defaultValue={String(profile.city ?? "")} className={input} /></label>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
    {saved && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 sm:col-span-2">Your profile has been saved.</p>}
    <div className="sm:col-span-2"><button disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{busy ? "Saving…" : "Save profile"}</button></div>
  </form>;
}
