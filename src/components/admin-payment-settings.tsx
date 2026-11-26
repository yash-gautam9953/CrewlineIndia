"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, LoaderCircle, QrCode, Save } from "lucide-react";

type Settings = {
  configured: boolean;
  googleFormUrl: string;
  feeAmount: number | null;
  instructions: string;
};

export function AdminPaymentSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [googleFormUrl, setGoogleFormUrl] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/payments/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Settings) => {
        setSettings(data);
        if (data.googleFormUrl) setGoogleFormUrl(data.googleFormUrl);
        if (data.feeAmount) setFeeAmount(String(data.feeAmount));
        if (data.instructions) setInstructions(data.instructions);
      })
      .catch(() => setSettings({ configured: false, googleFormUrl: "", feeAmount: null, instructions: "" }));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleFormUrl,
          feeAmount: feeAmount.trim() ? Number(feeAmount) : "",
          instructions,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save payment settings.");
      setSettings({
        configured: true,
        googleFormUrl,
        feeAmount: feeAmount.trim() ? Number(feeAmount) : null,
        instructions,
      });
      setMessage("Google Form UPI payment settings saved. All students will now see this payment link inside their internship workspace.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save payment settings.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "focus-ring mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-[#101D35]";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1769D2]">
            <QrCode size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1769D2]">UPI & Google Form Setup</p>
            <h2 className="text-lg font-bold text-[#101D35]">Google Form Payment Scanner Link</h2>
          </div>
        </div>
        {settings?.configured && (
          <a
            href={settings.googleFormUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 size={14} /> Active Form <ExternalLink size={12} />
          </a>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-600">
        Paste the Google Form URL that contains your UPI QR scanner. Students open this link inside their internship workspace, complete the UPI payment, and submit their verification request to this admin panel.
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
          Google Form URL (with UPI Scanner) *
          <input
            type="url"
            required
            value={googleFormUrl}
            onChange={(e) => setGoogleFormUrl(e.target.value)}
            placeholder="https://forms.gle/..."
            className={inputClass}
          />
        </label>

        <label className="text-xs font-semibold text-slate-700">
          Certificate / Processing Fee (INR, optional)
          <input
            type="number"
            min={1}
            max={1000000}
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            placeholder="e.g. 199"
            className={inputClass}
          />
        </label>

        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
          Instructions shown to students
          <textarea
            rows={2}
            maxLength={2000}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Open the Google Form, scan the UPI QR code to pay, and enter your UPI Transaction ID / UTR below for admin approval."
            className={`${inputClass} h-auto py-2.5`}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 sm:col-span-2">
            {message}
          </p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="admin-btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-semibold text-white hover:bg-[#123B70] disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={16} className="animate-spin text-white" /> : <Save size={16} className="text-white" />}
            {busy ? "Saving…" : "Save Payment Form Settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
