"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeDocumentForm({ documentId, disabled }: { documentId: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const reason = new FormData(event.currentTarget).get("reason");
      const response = await fetch(`/api/admin/documents/${encodeURIComponent(documentId)}/revoke`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not revoke certificate.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke certificate."); }
    finally { setBusy(false); }
  }
  if (disabled) return null;
  return <div className="mt-3">{!open ? <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-red-700 underline">Revoke certificate</button> : <form onSubmit={submit} className="space-y-2"><label className="block text-xs font-semibold text-slate-600">Revocation reason<textarea name="reason" required minLength={10} maxLength={2000} rows={2} className="focus-ring mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" /></label>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}<div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white">{busy ? "Saving…" : "Confirm revocation"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button></div></form>}</div>;
}
