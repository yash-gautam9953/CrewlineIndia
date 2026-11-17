"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";

export function AuthForm({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request failed.");
      const requested = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : undefined;
      router.replace(requested ?? result.redirectTo ?? "/account");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "focus-ring mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy placeholder:text-slate-400";
  return <form onSubmit={submit} className="mt-8 space-y-5">
    {isRegister && <label className="block text-sm font-medium text-slate-700">Full name<input name="fullName" autoComplete="name" required minLength={2} maxLength={160} className={inputClass} placeholder="Your name as it should appear on your offer" /></label>}
    <label className="block text-sm font-medium text-slate-700">Email<input name="email" autoComplete="email" type="email" required className={inputClass} placeholder="you@example.com" /></label>
    <label className="block text-sm font-medium text-slate-700">Password<input name="password" autoComplete={isRegister ? "new-password" : "current-password"} type="password" required minLength={isRegister ? 8 : undefined} maxLength={128} className={inputClass} placeholder={isRegister ? "At least 8 characters" : "Your password"} /></label>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-65" type="submit">{busy && <LoaderCircle size={17} className="animate-spin" />}{busy ? "Please wait…" : isRegister ? "Create student account" : "Sign in"}</button>
    {!isRegister && <div className="text-right text-sm"><Link href="/forgot-password" className="font-medium text-brand hover:text-blue-700">Forgot password?</Link></div>}
    <p className="pt-2 text-center text-sm text-slate-500">{isRegister ? "Already registered?" : "New to Crewline?"} <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-brand">{isRegister ? "Sign in" : "Create an account"}</Link></p>
  </form>;
}
