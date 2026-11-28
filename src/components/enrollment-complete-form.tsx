"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { readApiResponse } from "@/lib/http-client";

export function EnrollmentCompleteForm({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const submittingRef = useRef(false);

  async function complete() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/enrollments/${encodeURIComponent(enrollmentId)}/complete`, { method: "POST" });
      await readApiResponse(response, "Could not complete this enrollment.");
      startTransition(() => {
        router.refresh();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete this enrollment.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return <div className="mt-3">
    <button type="button" onClick={complete} disabled={busy || isRefreshing} className="admin-btn-primary inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#1769D2] px-3 text-xs font-semibold text-white border-transparent hover:bg-[#123B70] disabled:opacity-60">{(busy || isRefreshing) && <LoaderCircle size={14} className="animate-spin text-white" />}{busy ? "Checking requirements…" : isRefreshing ? "Updating…" : "Mark internship complete"}</button>
    {error && <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
  </div>;
}
