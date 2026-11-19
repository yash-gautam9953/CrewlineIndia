"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

type Props = { internshipSlug: string; studentName: string; studentEmail: string; profile: Record<string, unknown> };

export function ApplicationForm({ internshipSlug, studentName, studentEmail, profile }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputClass =
    "focus-ring mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#101D35] transition placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#151F32] dark:text-[#F1F5FB] dark:placeholder:text-slate-500";
  const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...fields, internshipSlug }),
      });
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

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          Name for your application *
          <input name="studentName" required minLength={2} maxLength={160} defaultValue={studentName} className={inputClass} />
        </label>
        <label className={labelClass}>
          Account email
          <input readOnly value={studentEmail} className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-[#1C2940] dark:text-slate-400`} />
        </label>
        <label className={labelClass}>
          Phone / WhatsApp *
          <input name="phone" type="tel" required minLength={8} maxLength={32} defaultValue={String(profile.phone ?? "")} className={inputClass} placeholder="+91 …" />
        </label>
        <label className={labelClass}>
          College / institute *
          <input name="college" required minLength={2} maxLength={180} defaultValue={String(profile.college ?? "")} className={inputClass} />
        </label>
        <label className={labelClass}>
          Course / degree *
          <input name="course" required minLength={2} maxLength={160} defaultValue={String(profile.course ?? "")} className={inputClass} placeholder="B.Tech Computer Science" />
        </label>
        <label className={labelClass}>
          Current year *
          <select name="currentYear" required defaultValue={String(profile.currentYear ?? "")} className={inputClass}>
            <option value="" disabled>Select year</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => (
              <option key={year} value={year}>
                {year}
                {year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Internship duration
          <input name="selectedDuration" value="1 Month" readOnly className={`${inputClass} cursor-not-allowed bg-slate-50 font-semibold text-[#101D35] dark:bg-[#1C2940] dark:text-[#F1F5FB]`} />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Fixed duration: Exactly 1 Calendar Month</span>
        </label>
        <label className={labelClass}>
          Internship start date *
          <input name="requestedStartDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} min={new Date().toISOString().slice(0, 10)} className={inputClass} />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Your enrollment starts on this date</span>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          City *
          <input name="city" required minLength={2} maxLength={120} defaultValue={String(profile.city ?? "")} className={inputClass} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          A short note for Crewline <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
          <textarea name="statement" maxLength={2000} rows={4} defaultValue="" className={inputClass} placeholder="What would you like us to know about your application?" />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        disabled={busy}
        className="admin-btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70] disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
        type="submit"
      >
        {busy ? <LoaderCircle size={17} className="animate-spin text-white" /> : null}
        {busy ? "Activating enrollment…" : "Enroll in Internship"}
        {!busy && <ArrowRight size={17} className="text-white" />}
      </button>

      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        Upon enrollment, your internship is immediately activated and your personalized offer letter and domain task become available in your dashboard.
      </p>
    </form>
  );
}
