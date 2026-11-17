"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyEmailForm({ userId, secret }: { userId: string; secret: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/verification", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, secret }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not verify email.");
      router.replace("/account?verified=1"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not verify email."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-6">{error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="min-h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? "Verifying…" : "Verify email address"}</button></form>;
}
