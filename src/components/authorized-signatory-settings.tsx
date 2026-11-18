"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { LoaderCircle, Upload } from "lucide-react";

type Settings = { configured: boolean; name: string; designation: string; signatureFileId: string };

export function AuthorizedSignatorySettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void fetch("/api/admin/documents/signatory", { cache: "no-store" }).then((response) => response.json()).then((value) => setSettings(value as Settings)).catch(() => setSettings({ configured: false, name: "", designation: "", signatureFileId: "" })); }, []);
  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : "");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/documents/signatory", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save signatory settings.");
      setSettings({ configured: true, name: String(formData.get("name")), designation: String(formData.get("designation")), signatureFileId: result.signatureFileId });
      setPreview("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save signatory settings."); }
    finally { setBusy(false); }
  }
  const input = "focus-ring mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-navy";
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Document authorization</p><h2 className="mt-2 text-xl font-bold text-navy">Authorized Signatory Settings</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Use only a signature image uploaded by the authorized signatory or with their permission. Replacing it keeps previously issued PDFs unchanged.</p>
    <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Signatory full name<input name="name" required minLength={2} maxLength={160} defaultValue={settings?.name ?? ""} className={input} /></label><label className="text-sm font-medium text-slate-700">Designation<input name="designation" required minLength={2} maxLength={160} defaultValue={settings?.designation ?? ""} className={input} /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Signature image (transparent PNG, up to 2 MB)<input name="signature" type="file" accept="image/png,.png" required className={`${input} h-auto py-2`} onChange={chooseFile} /></label>
      {(preview || settings?.configured) && <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:col-span-2"><Image src={preview || "/api/admin/documents/signatory/signature"} alt="Signature preview" width={500} height={150} unoptimized style={{ width: "auto", height: "auto" }} className="max-h-24 max-w-full object-contain" /></div>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><button disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}{busy ? "Saving…" : settings?.configured ? "Replace authorized signature" : "Save signatory settings"}</button></div>
    </form>
  </section>;
}
