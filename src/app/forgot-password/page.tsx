import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/password-recovery-form";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <main className="min-h-[65vh] bg-cloud px-5 py-16 sm:px-8 sm:py-24"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Account recovery</p><h1 className="mt-3 text-3xl font-bold text-navy">Reset your password</h1><p className="mt-3 text-sm leading-6 text-slate-600">Enter the email you used for your Crewline account. If it is registered, Appwrite will email a recovery link.</p><ForgotPasswordForm /><Link href="/login" className="mt-6 block text-center text-sm font-semibold text-brand">Back to sign in</Link></section></main>;
}
