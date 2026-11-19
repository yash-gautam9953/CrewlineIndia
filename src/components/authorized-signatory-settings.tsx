"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, Save } from "lucide-react";

type Settings = { configured: boolean; name: string; designation: string };

export function AuthorizedSignatorySettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/documents/signatory", { cache: "no-store" })
      .then((res) => res.json())
      .then((value: Settings) => {
        setSettings(value);
        if (value.name) setName(value.name);
        if (value.designation) setDesignation(value.designation);
      })
      .catch(() => setSettings({ configured: false, name: "", designation: "" }));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/documents/signatory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, designation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save signatory settings.");
      setSettings({ configured: true, name, designation });
      setMessage("Authorized signatory details saved successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save signatory settings.");
    } finally {
      setBusy(false);
    }
  }

  const input = "focus-ring mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#151F32]">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Document authorization</p>
      <h2 className="mt-2 text-xl font-bold text-navy dark:text-[#F1F5FB]">Authorized Signatory Settings</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-[#A8B5C8]">
        Signatory details (name and designation) are dynamically populated across all document templates (Offer Letter, Internship Certificate, and Project Certificate). The authorized signature image is already permanently embedded in the document templates.
      </p>

      {settings?.configured && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 dark:text-emerald-400" />
          <span>Currently configured: <strong>{settings.name}</strong> — {settings.designation}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Signatory full name
          <input
            name="name"
            required
            minLength={2}
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Yash Gautam"
            className={input}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Designation
          <input
            name="designation"
            required
            minLength={2}
            maxLength={160}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="e.g. Founder"
            className={input}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 sm:col-span-2 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </p>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="admin-btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-semibold text-white border-transparent hover:bg-[#123B70] disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={16} className="animate-spin text-white" /> : <Save size={16} className="text-white" />}
            {busy ? "Saving…" : "Save signatory settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
