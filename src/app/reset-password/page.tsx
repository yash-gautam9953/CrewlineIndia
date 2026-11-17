import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/password-recovery-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ userId?: string; secret?: string }> }) {
  const { userId, secret } = await searchParams;
  const valid = Boolean(userId && secret && userId.length < 65 && secret.length < 513);
  return <main className="min-h-[65vh] bg-cloud px-5 py-16 sm:px-8 sm:py-24"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Account recovery</p><h1 className="mt-3 text-3xl font-bold text-navy">Choose a new password</h1>{valid ? <ResetPasswordForm userId={userId!} secret={secret!} /> : <p className="mt-4 text-sm leading-6 text-slate-600">This recovery link is incomplete. Request a new link from <Link href="/forgot-password" className="font-semibold text-brand">password recovery</Link>.</p>}</section></main>;
}
