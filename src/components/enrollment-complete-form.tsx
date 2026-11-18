"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export function EnrollmentCompleteForm({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function complete() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/enrollments/${encodeURIComponent(enrollmentId)}/complete`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not complete this enrollment.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete this enrollment.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-3">
    <button type="button" onClick={complete} disabled={busy} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy && <LoaderCircle size={14} className="animate-spin" />}{busy ? "Checking requirements…" : "Mark internship complete"}</button>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </div>;
}
