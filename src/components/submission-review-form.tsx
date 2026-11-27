"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";

type Props = {
  submissionId: string;
  status: string;
  maxScore?: number;
};

export function SubmissionReviewForm({ submissionId, status, maxScore }: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approved" | "revision_required" | "rejected">("approved");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch(`/api/admin/submissions/${encodeURIComponent(submissionId)}/review`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save review.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save review.");
    } finally {
      setBusy(false);
    }
  }

  if (["approved", "rejected"].includes(status)) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 dark:bg-[#1C2940] dark:text-[#A8B5C8]">
        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
        <span>
          Final decision recorded: <strong className="capitalize text-navy dark:text-[#F1F5FB]">{status}</strong>.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#151F32]">
      <p className="text-xs font-bold uppercase tracking-wider text-brand">Admin Approval</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-[#A8B5C8]">
        Check your Google Form payment responses and review the project above, then click Approve to unlock both certificates.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Decision Action
          <select
            name="decision"
            value={decision}
            onChange={(e) => setDecision(e.target.value as "approved" | "revision_required" | "rejected")}
            className="focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"
          >
            <option value="approved">APPROVE (Verify payment & unlock certificates)</option>
            <option value="revision_required">REQUEST REVISION (Ask student to fix)</option>
            <option value="rejected">REJECT (Keep locked)</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Score {typeof maxScore === "number" ? `(Max: ${maxScore})` : "(Optional)"}
          <input
            name="score"
            type="number"
            min={0}
            max={typeof maxScore === "number" ? maxScore : 10000}
            placeholder="e.g. 95"
            className="focus-ring mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"
          />
        </label>

        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
          Note / Feedback {decision === "approved" ? "(Optional)" : "(Required reason)"}
          <textarea
            name="feedback"
            required={decision !== "approved"}
            minLength={decision === "approved" ? undefined : 5}
            maxLength={5000}
            rows={2}
            placeholder={
              decision === "approved"
                ? "Optional review note (leave blank to auto-fill default approval note)"
                : "Please explain why revision or rejection is needed..."
            }
            className="focus-ring mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="submit"
          disabled={busy}
          className="admin-btn-primary inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1769D2] px-5 text-sm font-semibold text-white border-transparent hover:bg-[#123B70] disabled:opacity-50"
        >
          {busy ? <LoaderCircle size={15} className="animate-spin text-white" /> : null}
          {busy
            ? "Processing…"
            : decision === "approved"
              ? "Approve & Issue Certificates"
              : decision === "revision_required"
                ? "Request Revision"
                : "Reject Project"}
        </button>
        {decision === "approved" && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Marks payment verified & issues both certificates immediately.
          </span>
        )}
      </div>
    </form>
  );
}
