"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LoaderCircle, ShieldCheck } from "lucide-react";

type Props = { documentType: "offer" | "internship_completion" | "project_completion"; sourceId: string; studentName: string; title: string; duration?: string; reissueFromId?: string };

export function AdminDocumentIssuer({ documentType, sourceId, studentName, title, duration = "", reissueFromId }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState("");
  const [token, setToken] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [issued, setIssued] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  const needsOfferInfo = documentType === "offer";
  async function requestPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setToken("");
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/admin/documents/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentType, sourceId, reissueFromId, ...fields }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not prepare document preview.");
      const binary = atob(result.previewPdf as string);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      setPreview(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }))); setToken(result.token); setDocumentId(result.documentId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare document preview."); }
    finally { setBusy(false); }
  }
  async function confirmIssue() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/documents/issue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not issue document.");
      setMessage(`Issued ${result.documentId}. The PDF is now available in the student's My Documents section.`);
      setPreview(""); setToken(""); setIssued(true); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not issue document."); }
    finally { setBusy(false); }
  }
  return <article className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-navy">{studentName}</p><p className="mt-1 text-xs text-slate-500">{title}{duration ? ` · ${duration}` : ""}</p></div>{documentId && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{documentId}</span>}</div>
    {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {!preview && !issued && <form onSubmit={requestPreview} className="mt-4 grid gap-3 sm:grid-cols-2">{needsOfferInfo && <><label className="text-xs font-semibold text-slate-600">Offer start date<input name="startDate" type="date" required className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Duration<input name="duration" required defaultValue={duration} maxLength={80} placeholder="e.g. 8 weeks" className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Work mode<select name="workMode" defaultValue="Virtual / Remote" className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option>Virtual / Remote</option><option>Hybrid</option><option>On-site</option></select></label><label className="text-xs font-semibold text-slate-600">Stipend, if applicable<input name="stipend" maxLength={120} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Leave blank if unpaid / not applicable" /></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Applicable offer terms<textarea name="terms" maxLength={1200} rows={3} className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Do not include unapproved promises or benefits." /></label></>}{reissueFromId && <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Authorized reissue reason<textarea name="reissueReason" required minLength={10} maxLength={2000} rows={2} className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Explain the correction or reissue reason." /></label>}
      <button disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-2">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Eye size={16} />}Generate preview</button></form>}
    {preview && <div className="mt-4"><p className="mb-2 text-sm font-semibold text-navy">Review the generated PDF before issuing</p><iframe title={`${documentType} PDF preview for ${studentName}`} src={preview} className="h-[min(75vh,850px)] w-full rounded-xl border border-slate-300 bg-white" /><p className="mt-2 text-xs text-slate-500">Check the student, dates, document ID, and authorized signature. Issuing creates the same private immutable PDF. Preview expires after 15 minutes.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={confirmIssue} disabled={busy || !token} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}Confirm and issue</button><button type="button" disabled={busy} onClick={() => { setPreview(""); setToken(""); setDocumentId(""); }} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700">Cancel preview</button></div></div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </article>;
}
