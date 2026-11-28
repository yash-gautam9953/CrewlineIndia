"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, ShieldCheck } from "lucide-react";
import { readApiResponse } from "@/lib/http-client";
import { Button } from "@/components/ui/button";
import {
  alertErrorClass,
  alertSuccessClass,
  formInputClass,
  formLabelClass,
  formSelectClass,
  formTextareaClass,
} from "@/components/ui/form-controls";

type Props = {
  documentType: "offer" | "internship_completion" | "project_completion";
  sourceId: string;
  studentName: string;
  title: string;
  duration?: string;
  reissueFromId?: string;
};

export function AdminDocumentIssuer({ documentType, sourceId, studentName, title, duration = "", reissueFromId }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState("");
  const [token, setToken] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [issued, setIssued] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const submittingRef = useRef(false);

  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  const needsOfferInfo = documentType === "offer";

  async function requestPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setToken("");
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/admin/documents/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentType, sourceId, reissueFromId, ...fields }),
      });
      const result = await readApiResponse<{ previewPdf?: string; token?: string; documentId?: string; error?: string }>(
        response,
        "Could not prepare document preview."
      );
      const binary = atob(result.previewPdf ?? "");
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      setPreview(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
      setToken(result.token ?? "");
      setDocumentId(result.documentId ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare document preview.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function confirmIssue() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/documents/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await readApiResponse<{ documentId?: string; error?: string }>(
        response,
        "Could not issue document."
      );
      setMessage(`Issued ${result.documentId}. The PDF is now available in the student's My Documents section.`);
      setPreview("");
      setToken("");
      setIssued(true);
      startTransition(() => {
        router.refresh();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not issue document.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1C2940]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-navy dark:text-[#F1F5FB]">{studentName}</p>
          <p className="mt-1 break-words text-xs text-slate-500 dark:text-[#A8B5C8]">
            {title}
            {duration ? ` · ${duration}` : ""}
          </p>
        </div>
        {documentId && (
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 font-mono text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            {documentId}
          </span>
        )}
      </div>

      {message && <p role="status" className={`${alertSuccessClass} mt-3`}>{message}</p>}

      {!preview && !issued && (
        <form onSubmit={requestPreview} className="mt-4 grid gap-3 sm:grid-cols-2">
          {needsOfferInfo && (
            <>
              <label className={formLabelClass}>
                Offer start date <span className="text-rose-600" aria-hidden="true">*</span>
                <input name="startDate" type="date" required className={formInputClass} />
              </label>
              <label className={formLabelClass}>
                Duration <span className="text-rose-600" aria-hidden="true">*</span>
                <input name="duration" required defaultValue={duration} maxLength={80} placeholder="e.g. 8 weeks" className={formInputClass} />
              </label>
              <label className={formLabelClass}>
                Work mode
                <select name="workMode" defaultValue="Virtual / Remote" className={formSelectClass}>
                  <option>Virtual / Remote</option>
                  <option>Hybrid</option>
                  <option>On-site</option>
                </select>
              </label>
              <label className={formLabelClass}>
                Stipend, if applicable
                <input name="stipend" maxLength={120} className={formInputClass} placeholder="Leave blank if unpaid / not applicable" />
              </label>
              <label className={`${formLabelClass} sm:col-span-2`}>
                Applicable offer terms
                <textarea name="terms" maxLength={1200} rows={3} className={formTextareaClass} placeholder="Do not include unapproved promises or benefits." />
              </label>
            </>
          )}
          {reissueFromId && (
            <label className={`${formLabelClass} sm:col-span-2`}>
              Authorized reissue reason <span className="text-rose-600" aria-hidden="true">*</span>
              <textarea name="reissueReason" required minLength={10} maxLength={2000} rows={2} className={formTextareaClass} placeholder="Explain the correction or reissue reason." />
            </label>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" size="md" loading={busy}>
              {!busy && <Eye size={16} aria-hidden="true" />}
              {busy ? "Generating preview…" : "Generate preview"}
            </Button>
          </div>
        </form>
      )}

      {preview && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-navy dark:text-[#F1F5FB]">Review the generated PDF before issuing</p>
          <iframe title={`${documentType} PDF preview for ${studentName}`} src={preview} className="h-[min(75vh,850px)] w-full rounded-xl border border-slate-300 bg-white dark:border-slate-700" />
          <p className="mt-2 text-xs text-slate-500 dark:text-[#A8B5C8]">
            Check the student, dates, document ID, and authorized signature. Issuing creates the same private immutable PDF. Preview expires after 15 minutes.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button type="button" variant="success" size="md" loading={busy || isRefreshing} disabled={!token} onClick={confirmIssue}>
              {!busy && !isRefreshing && <ShieldCheck size={16} aria-hidden="true" />}
              {busy ? "Issuing…" : "Confirm and issue"}
            </Button>
            <Button type="button" variant="outline" size="md" disabled={busy || isRefreshing} onClick={() => { setPreview(""); setToken(""); setDocumentId(""); }}>
              Cancel preview
            </Button>
          </div>
        </div>
      )}

      {error && <p role="alert" className={`${alertErrorClass} mt-3`}>{error}</p>}
    </article>
  );
}
