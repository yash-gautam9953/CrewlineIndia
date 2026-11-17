"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

type Props = { internshipSlug: string; studentName: string; studentEmail: string; profile: Record<string, unknown> };

export function ApplicationForm({ internshipSlug, studentName, studentEmail, profile }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputClass = "focus-ring mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy placeholder:text-slate-400";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...fields, internshipSlug }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Application failed.");
      router.replace(result.redirectTo);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Application failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">Name for your application<input name="studentName" required minLength={2} maxLength={160} defaultValue={studentName} className={inputClass} /></label>
      <label className="block text-sm font-medium text-slate-700">Account email<input readOnly value={studentEmail} className={`${inputClass} bg-slate-50 text-slate-500`} /></label>
      <label className="block text-sm font-medium text-slate-700">Phone / WhatsApp<input name="phone" type="tel" required minLength={8} maxLength={32} defaultValue={String(profile.phone ?? "")} className={inputClass} placeholder="+91 …" /></label>
      <label className="block text-sm font-medium text-slate-700">College / institute<input name="college" required minLength={2} maxLength={180} defaultValue={String(profile.college ?? "")} className={inputClass} /></label>
      <label className="block text-sm font-medium text-slate-700">Course / degree<input name="course" required minLength={2} maxLength={160} defaultValue={String(profile.course ?? "")} className={inputClass} placeholder="B.Tech Computer Science" /></label>
      <label className="block text-sm font-medium text-slate-700">Current year<select name="currentYear" required defaultValue={String(profile.currentYear ?? "")} className={inputClass}><option value="" disabled>Select year</option>{[1,2,3,4,5,6,7,8].map((year) => <option key={year} value={year}>{year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year</option>)}</select></label>
      <label className="block text-sm font-medium text-slate-700 sm:col-span-2">City<input name="city" required minLength={2} maxLength={120} defaultValue={String(profile.city ?? "")} className={inputClass} /></label>
      <label className="block text-sm font-medium text-slate-700 sm:col-span-2">A short note for Crewline <span className="font-normal text-slate-400">(optional)</span><textarea name="statement" maxLength={2000} rows={4} defaultValue="" className="focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy" placeholder="What would you like us to know about your application?" /></label>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto" type="submit">{busy ? <LoaderCircle size={17} className="animate-spin" /> : null}{busy ? "Submitting…" : "Submit application"}{!busy && <ArrowRight size={17} />}</button>
    <p className="text-xs leading-5 text-slate-500">Your application details are visible to authorized Crewline administrators and used to contact you about this internship.</p>
  </form>;
}
