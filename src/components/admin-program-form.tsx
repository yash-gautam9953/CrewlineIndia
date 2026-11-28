"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { readApiResponse } from "@/lib/http-client";

const domains = ["Web Development", "Python Development", "Java Development", "AI/ML", "Data Science", "UI/UX Design", "Cybersecurity", "Cloud Computing"];

export function AdminProgramForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const submittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const form = event.currentTarget;
      const body = Object.fromEntries(new FormData(form).entries());
      const response = await fetch("/api/admin/internships", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      await readApiResponse(response, "Could not save internship.");
      form.reset();
      setMessage("Internship program saved.");
      startTransition(() => {
        router.refresh();
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save internship.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  const input = "focus-ring mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]";
  const textarea = "focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]";

  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Internship title<input name="title" required minLength={3} maxLength={180} className={input} /></label>
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Domain<select name="domain" required defaultValue="" className={input}><option value="" disabled>Select domain</option>{domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Program duration<input name="duration" required maxLength={80} placeholder="e.g. 8 weeks" className={input} /></label>
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Application deadline<input name="applicationDeadline" type="date" className={input} /></label>
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">Description<textarea name="description" required minLength={10} maxLength={12000} rows={4} className={textarea} /></label>
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">Eligibility<textarea name="eligibility" maxLength={4000} rows={3} className={textarea} /></label>
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">Learning outcomes <span className="font-normal text-slate-400">(optional)</span><textarea name="learningOutcomes" maxLength={4000} rows={3} className={textarea} /></label>
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Publication<select name="publicationStatus" className={input}><option value="draft">Save as draft</option><option value="published">Publish now</option></select></label>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 sm:col-span-2 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
    <div className="sm:col-span-2"><button type="submit" disabled={busy || isRefreshing} className="admin-btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-semibold text-white border-transparent hover:bg-[#123B70] disabled:opacity-60">{(busy || isRefreshing) && <LoaderCircle size={16} className="animate-spin text-white" />}{busy ? "Saving…" : isRefreshing ? "Updating…" : "Save internship"}</button></div>
  </form>;
}
