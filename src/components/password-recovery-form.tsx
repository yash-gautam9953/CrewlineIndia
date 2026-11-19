"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      const email = new FormData(event.currentTarget).get("email");
      const response = await fetch("/api/auth/recovery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not send recovery email.");
      setMessage(data.message);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send recovery email."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Account email<input className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]" name="email" type="email" required /></label>{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}<button disabled={busy} className="min-h-12 w-full rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Send recovery email"}</button></form>;
}

export function ResetPasswordForm({ userId, secret }: { userId: string; secret: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const password = new FormData(event.currentTarget).get("password");
      const response = await fetch("/api/auth/recovery/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, secret, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not reset password.");
      router.replace(data.redirectTo);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not reset password."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New password<input className="focus-ring mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]" name="password" type="password" minLength={8} maxLength={128} required /></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}<button disabled={busy} className="min-h-12 w-full rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Set new password"}</button></form>;
}
