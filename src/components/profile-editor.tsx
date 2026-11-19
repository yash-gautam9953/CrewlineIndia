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
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save your details.");
      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your details.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "focus-ring mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-[#101D35] transition placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#151F32] dark:text-[#F1F5FB] dark:placeholder:text-slate-500";
  const labelClass = "text-sm font-semibold text-slate-700 dark:text-slate-300";

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>
        Full name *
        <input
          name="fullName"
          required
          minLength={2}
          maxLength={160}
          defaultValue={String(profile.fullName ?? "")}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Account email
        <input
          value={email}
          readOnly
          className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-[#1C2940] dark:text-slate-400`}
        />
      </label>

      <label className={labelClass}>
        Phone / WhatsApp
        <input
          name="phone"
          maxLength={32}
          defaultValue={String(profile.phone ?? "")}
          className={inputClass}
          placeholder="+91…"
        />
      </label>

      <label className={labelClass}>
        College / University
        <input
          name="college"
          maxLength={180}
          defaultValue={String(profile.college ?? "")}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Course / Degree
        <input
          name="course"
          maxLength={160}
          defaultValue={String(profile.course ?? "")}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Current year
        <select
          name="currentYear"
          defaultValue={profile.currentYear ? String(profile.currentYear) : ""}
          className={inputClass}
        >
          <option value="">Choose year</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => (
            <option key={year} value={year}>
              {year}
              {year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year
            </option>
          ))}
        </select>
      </label>

      <label className={`${labelClass} sm:col-span-2`}>
        City
        <input
          name="city"
          maxLength={120}
          defaultValue={String(profile.city ?? "")}
          className={inputClass}
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 sm:col-span-2"
        >
          {error}
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 sm:col-span-2"
        >
          Your profile has been saved successfully.
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="admin-btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123B70] disabled:opacity-60"
        >
          {busy ? <LoaderCircle size={16} className="animate-spin text-white" /> : <Save size={16} className="text-white" />}
          {busy ? "Saving…" : "Save profile changes"}
        </button>
      </div>
    </form>
  );
}
