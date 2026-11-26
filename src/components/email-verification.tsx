"use client";

import { useState } from "react";

export function EmailVerification({ verified }: { verified: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function requestVerification() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/verification", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send verification email.");
      setMessage("If verification is needed, Appwrite has sent a link to your account email.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not send verification email."); }
    finally { setBusy(false); }
  }
  if (verified) return <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Your email address is verified.</div>;
  return <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-950">Email verification required</p><p className="mt-1 text-xs leading-5 text-amber-900">You must verify your email address before enrolling in an internship, submitting project work, or submitting payment proofs.</p><button type="button" disabled={busy} onClick={requestVerification} className="mt-3 min-h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{busy ? "Sending…" : "Send verification email"}</button>{message && <p role="status" className="mt-3 text-xs leading-5 text-amber-950">{message}</p>}</div>;
}
