"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/http-client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { alertErrorClass, alertSuccessClass, formInputLgClass, formLabelLgClass } from "@/components/ui/form-controls";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const email = new FormData(event.currentTarget).get("email");
      const response = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await readApiResponse<{ message?: string; error?: string }>(response, "Could not send recovery email.");
      setMessage(data.message ?? "If this email is registered, a recovery link has been sent.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send recovery email.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <div>
        <label htmlFor="recovery-email" className={formLabelLgClass}>
          Account email <span className="text-rose-600" aria-hidden="true">*</span>
        </label>
        <input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="username"
          spellCheck={false}
          required
          placeholder="you@example.com"
          className={formInputLgClass}
        />
      </div>

      {message && (
        <p role="status" className={alertSuccessClass}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className={alertErrorClass}>
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
        {busy ? "Sending…" : "Send recovery email"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ userId, secret }: { userId: string; secret: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setBusy(true);
    try {
      const password = new FormData(event.currentTarget).get("password");
      const response = await fetch("/api/auth/recovery/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, secret, password }),
      });
      const data = await readApiResponse<{ redirectTo?: string; error?: string }>(response, "Could not reset password.");
      router.replace(data.redirectTo || "/login");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset password.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <div>
        <label htmlFor="reset-password" className={formLabelLgClass}>
          New password <span className="text-rose-600" aria-hidden="true">*</span>
        </label>
        <PasswordInput
          id="reset-password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          className="mt-2"
          placeholder="At least 8 characters"
        />
      </div>

      {error && (
        <p role="alert" className={alertErrorClass}>
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
        {busy ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
