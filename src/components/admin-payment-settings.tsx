"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, QrCode, Save } from "lucide-react";
import { readApiResponse } from "@/lib/http-client";
import { Button } from "@/components/ui/button";
import {
  alertErrorClass,
  alertSuccessClass,
  formInputClass,
  formLabelClass,
  formTextareaClass,
} from "@/components/ui/form-controls";

export type AdminPaymentSettingsData = {
  configured: boolean;
  googleFormUrl: string;
  feeAmount: number | null;
  instructions: string;
};

export function AdminPaymentSettings({ initialSettings }: { initialSettings?: AdminPaymentSettingsData | null }) {
  const [settings, setSettings] = useState<AdminPaymentSettingsData | null>(initialSettings ?? null);
  const [googleFormUrl, setGoogleFormUrl] = useState(initialSettings?.googleFormUrl ?? "");
  const [feeAmount, setFeeAmount] = useState(initialSettings?.feeAmount ? String(initialSettings.feeAmount) : "");
  const [instructions, setInstructions] = useState(initialSettings?.instructions ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  useEffect(() => {
    if (initialSettings) return;
    void fetch("/api/admin/payments/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: AdminPaymentSettingsData) => {
        setSettings(data);
        if (data.googleFormUrl) setGoogleFormUrl(data.googleFormUrl);
        if (data.feeAmount) setFeeAmount(String(data.feeAmount));
        if (data.instructions) setInstructions(data.instructions);
      })
      .catch(() => setSettings({ configured: false, googleFormUrl: "", feeAmount: null, instructions: "" }));
  }, [initialSettings]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
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
      await readApiResponse(response, "Could not save payment settings.");
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
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#151F32]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF3FF] text-[#1769D2] dark:bg-blue-950/60 dark:text-blue-300">
            <QrCode size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1769D2] dark:text-blue-400">UPI & Google Form Setup</p>
            <h2 className="text-lg font-bold text-[#101D35] dark:text-[#F1F5FB]">Google Form Payment Scanner Link</h2>
          </div>
        </div>
        {settings?.configured && (
          <a
            href={settings.googleFormUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
          >
            <CheckCircle2 size={14} /> Active Form <ExternalLink size={12} />
          </a>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-[#A8B5C8]">
        Paste the single Google Form URL containing your UPI QR scanner. All students will open this same form link directly when they click Pay Now in their internship workspace.
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className={`${formLabelClass} sm:col-span-2`}>
          Google Form URL (with UPI Scanner) <span className="text-rose-600" aria-hidden="true">*</span>
          <input
            type="url"
            required
            value={googleFormUrl}
            onChange={(e) => setGoogleFormUrl(e.target.value)}
            placeholder="https://forms.gle/..."
            className={formInputClass}
          />
        </label>

        <label className={formLabelClass}>
          Certificate / Processing Fee (INR, optional)
          <input
            type="number"
            min={1}
            max={1000000}
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            placeholder="e.g. 199"
            className={formInputClass}
          />
        </label>

        <label className={`${formLabelClass} sm:col-span-2`}>
          Instructions shown to students
          <textarea
            rows={2}
            maxLength={2000}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Open the Google Form, scan the UPI QR code to pay, and submit your verification request for admin approval."
            className={formTextareaClass}
          />
        </label>

        {error && (
          <p role="alert" className={`${alertErrorClass} sm:col-span-2`}>
            {error}
          </p>
        )}
        {message && (
          <p role="status" className={`${alertSuccessClass} sm:col-span-2`}>
            {message}
          </p>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" size="md" loading={busy}>
            {!busy && <Save size={16} aria-hidden="true" />}
            {busy ? "Saving…" : "Save Payment Form Settings"}
          </Button>
        </div>
      </form>
    </section>
  );
}
