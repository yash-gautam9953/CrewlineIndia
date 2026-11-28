"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EnrollmentCelebrationModal({ show = false }: { show?: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (show && typeof window !== "undefined" && window.history?.replaceState) {
      const url = new URL(window.location.href);
      if (url.searchParams.has("enrolled") || url.searchParams.has("applied")) {
        url.searchParams.delete("enrolled");
        url.searchParams.delete("applied");
        window.history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
      }
    }
  }, [show]);

  useEffect(() => {
    if (!show || dismissed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show, dismissed]);

  if (!show || dismissed) return null;

  function dismiss() {
    setDismissed(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="congrats-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div onClick={dismiss} className="fixed inset-0 bg-[#0B1220]/70 backdrop-blur-sm transition-opacity" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl dark:border-slate-800 dark:bg-[#151F32] sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-100/60 blur-2xl dark:bg-blue-950/40" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-100/60 blur-2xl dark:bg-purple-950/40" />

        <button
          type="button"
          onClick={dismiss}
          aria-label="Close modal"
          className="focus-ring absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]"
        >
          <X size={18} />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF3FF] text-[#1769D2] ring-8 ring-blue-50/70 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-950/30">
          <Sparkles className="h-8 w-8" aria-hidden="true" />
        </div>

        <h2 id="congrats-modal-title" className="mt-5 text-2xl font-bold tracking-tight text-[#123B70] dark:text-[#F1F5FB] sm:text-3xl">
          Congratulations!
        </h2>

        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700 dark:text-slate-300">
          You have successfully enrolled in your internship program at{" "}
          <span className="font-bold text-[#1769D2] dark:text-blue-400">Crewline</span>.
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-[#A8B5C8]">
          Your internship journey starts now. Your offer letter and assigned task are ready in your dashboard.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/50 dark:bg-[#1C2940]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-semibold text-[#123B70] dark:text-[#F1F5FB]">Offer Letter</p>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#A8B5C8]">Ready in My Documents</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/50 dark:bg-[#1C2940]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-semibold text-[#123B70] dark:text-[#F1F5FB]">Assigned Task</p>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#A8B5C8]">Ready in Project workspace</p>
          </div>
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#1769D2] dark:text-blue-400">
          Learn. Build. Get Recognized.
        </p>

        <div className="mt-6">
          <Button type="button" onClick={dismiss} variant="primary" size="lg" fullWidth>
            Go to My Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
