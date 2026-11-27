"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, ExternalLink, LoaderCircle } from "lucide-react";

type CreatedDoc = {
  documentId: string;
  downloadUrl: string;
  verifyUrl: string;
};

export function AdminCustomCertificateForm() {
  const router = useRouter();
  const [documentType, setDocumentType] = useState<"internship_completion" | "project_completion" | "offer">(
    "internship_completion"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedDoc | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setCreated(null);
    try {
      const formEl = event.currentTarget;
      const body = Object.fromEntries(new FormData(formEl).entries());
      const response = await fetch("/api/admin/documents/custom", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not generate certificate.");
      setCreated({
        documentId: result.documentId,
        downloadUrl: result.downloadUrl,
        verifyUrl: result.verifyUrl,
      });
      formEl.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate certificate.");
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const input =
    "focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]";
  const label = "text-xs font-semibold text-slate-700 dark:text-slate-300";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-[#151F32]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1769D2] dark:bg-blue-950/60 dark:text-blue-300">
          <Award size={20} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1769D2] dark:text-blue-400">
            Direct Issuance
          </p>
          <h2 className="text-xl font-bold text-navy dark:text-[#F1F5FB]">
            Generate Custom Certificate / Document
          </h2>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-600 dark:text-[#A8B5C8]">
        Enter student details manually to issue an official PDF certificate or offer letter anytime. Every generated certificate gets a short CW ID and works on the public QR verification page.
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Document Type *
          <select
            name="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as "internship_completion" | "project_completion" | "offer")}
            className={input}
          >
            <option value="internship_completion">Internship Completion Certificate</option>
            <option value="project_completion">Project Completion Certificate</option>
            <option value="offer">Offer Letter</option>
          </select>
        </label>

        <label className={label}>
          Student Full Name *
          <input name="studentName" required minLength={2} maxLength={160} placeholder="e.g. Rahul Sharma" className={input} />
        </label>

        <label className={label}>
          Internship Title / Role *
          <input
            name="documentTitle"
            required
            minLength={2}
            maxLength={180}
            placeholder="e.g. Web Development Internship"
            className={input}
          />
        </label>

        <label className={label}>
          Domain *
          <input name="domain" required minLength={2} maxLength={120} placeholder="e.g. Web Development" className={input} />
        </label>

        {documentType === "project_completion" && (
          <label className={`${label} sm:col-span-2`}>
            Project Title *
            <input
              name="projectTitle"
              required
              minLength={2}
              maxLength={180}
              placeholder="e.g. E-Commerce Storefront with Admin Dashboard"
              className={input}
            />
          </label>
        )}

        {documentType !== "project_completion" && (
          <>
            <label className={label}>
              Duration *
              <input name="duration" required defaultValue="1 Month" maxLength={80} placeholder="e.g. 1 Month" className={input} />
            </label>

            <label className={label}>
              Work Mode
              <select name="workMode" defaultValue="Virtual / Remote" className={input}>
                <option value="Virtual / Remote">Virtual / Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </label>

            <label className={label}>
              Start Date *
              <input name="startDate" type="date" required className={input} />
            </label>

            <label className={label}>
              End Date *
              <input name="endDate" type="date" required className={input} />
            </label>
          </>
        )}

        <label className={label}>
          Issue Date <span className="font-normal text-slate-400">(defaults to today)</span>
          <input name="issueDate" type="date" defaultValue={today} className={input} />
        </label>

        <label className={label}>
          Student Email <span className="font-normal text-slate-400">(optional — links to student account if registered)</span>
          <input name="studentEmail" type="email" placeholder="student@example.com" className={input} />
        </label>

        {documentType === "offer" && (
          <>
            <label className={label}>
              Stipend <span className="font-normal text-slate-400">(optional)</span>
              <input name="stipend" maxLength={120} placeholder="Leave blank if unpaid" className={input} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Offer Terms <span className="font-normal text-slate-400">(optional)</span>
              <textarea name="terms" maxLength={1200} rows={2} className={`${input} h-auto py-2`} />
            </label>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {created && (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 sm:col-span-2 sm:flex-row sm:items-center dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-700 dark:text-emerald-400" />
              <div>
                <p className="font-bold">Generated {created.documentId}</p>
                <p className="text-xs opacity-90">Document saved and ready to download or verify.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={created.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="admin-btn-primary inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#1769D2] px-3.5 text-xs font-semibold text-white hover:bg-[#123B70]"
              >
                Open PDF <ExternalLink size={13} className="text-white" />
              </a>
              {created.verifyUrl && (
                <a
                  href={created.verifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Verify Page <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="admin-btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1769D2] px-6 text-sm font-semibold text-white border-transparent hover:bg-[#123B70] disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={16} className="animate-spin text-white" /> : <Award size={16} className="text-white" />}
            {busy ? "Generating PDF…" : "Generate & Issue Document"}
          </button>
        </div>
      </form>
    </section>
  );
}
