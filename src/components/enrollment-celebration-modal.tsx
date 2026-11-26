"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";

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
      {/* Backdrop */}
      <div
        onClick={dismiss}
        className="fixed inset-0 bg-[#0f1d3b]/70 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 text-center shadow-2xl sm:p-9 animate-in fade-in zoom-in-95 duration-200">
        {/* Subtle decorative background gradient */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-100/60 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-100/60 blur-2xl" />

        {/* Close icon button */}
        <button
          onClick={dismiss}
          aria-label="Close modal"
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X size={18} />
        </button>

        {/* Celebratory Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-brand shadow-inner ring-8 ring-blue-50/50">
          <Sparkles className="h-8 w-8 text-blue-600" />
        </div>

        {/* Title */}
        <h2 id="congrats-modal-title" className="mt-5 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Congratulations! 🎉
        </h2>

        {/* Primary Message */}
        <p className="mt-3 text-base font-medium leading-relaxed text-slate-700">
          You have successfully enrolled in your internship program at <span className="font-semibold text-brand">Crewline</span>.
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your internship journey starts now. Your offer letter and assigned task are ready in your dashboard.
        </p>

        {/* Highlight Feature Badges */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 flex-none" />
              <p className="text-xs font-semibold text-navy">Offer Letter</p>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Ready in My Documents</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 flex-none" />
              <p className="text-xs font-semibold text-navy">Assigned Task</p>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Ready in Project workspace</p>
          </div>
        </div>

        {/* Tagline */}
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-brand">
          Learn. Build. Get Recognized.
        </p>

        {/* Primary Action Button */}
        <button
          onClick={dismiss}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition"
        >
          Go to My Dashboard
        </button>
      </div>
    </div>
  );
}
