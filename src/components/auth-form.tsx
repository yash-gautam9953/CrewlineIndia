"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { readApiResponse } from "@/lib/http-client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { alertErrorClass, formInputLgClass, formLabelLgClass } from "@/components/ui/form-controls";

export function AuthForm({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setBusy(true);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await readApiResponse<{ error?: string; redirectTo?: string }>(response, "Request failed.");
      const requested = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : undefined;
      router.replace(requested ?? result.redirectTo ?? "/account");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed. Please try again.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {isRegister && (
        <div>
          <label htmlFor="auth-fullname" className={formLabelLgClass}>
            Full name <span className="text-rose-600" aria-hidden="true">*</span>
          </label>
          <input
            id="auth-fullname"
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={160}
            className={formInputLgClass}
            placeholder="Your name as it should appear on your offer"
          />
        </div>
      )}

      <div>
        <label htmlFor="auth-email" className={formLabelLgClass}>
          Email address <span className="text-rose-600" aria-hidden="true">*</span>
        </label>
        <input
          id="auth-email"
          name="email"
          autoComplete="username"
          type="email"
          spellCheck={false}
          required
          className={formInputLgClass}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="auth-password" className={formLabelLgClass}>
          Password <span className="text-rose-600" aria-hidden="true">*</span>
        </label>
        <PasswordInput
          id="auth-password"
          name="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 8 : undefined}
          maxLength={128}
          className="mt-2"
          placeholder={isRegister ? "At least 8 characters" : "Your password"}
        />
      </div>

      {error && (
        <p role="alert" className={alertErrorClass}>
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
        {busy ? "Please wait…" : isRegister ? "Create student account" : "Sign in"}
      </Button>

      {!isRegister && (
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="focus-ring rounded font-medium text-[#1769D2] hover:underline dark:text-blue-400">
            Forgot password?
          </Link>
        </div>
      )}

      <p className="pt-2 text-center text-sm text-slate-500 dark:text-[#A8B5C8]">
        {isRegister ? "Already registered?" : "New to Crewline?"}{" "}
        <Link href={isRegister ? "/login" : "/register"} className="focus-ring rounded font-semibold text-[#1769D2] hover:underline dark:text-blue-400">
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
