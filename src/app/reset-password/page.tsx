import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/password-recovery-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ userId?: string; secret?: string }> }) {
  const { userId, secret } = await searchParams;
  const valid = Boolean(userId && secret && userId.length < 65 && secret.length < 513);
  return <main className="min-h-[65vh] bg-cloud px-5 py-16 dark:bg-[#0B1220] sm:px-8 sm:py-24"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-[#151F32] sm:p-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand dark:text-blue-400">Account recovery</p><h1 className="mt-3 text-3xl font-bold text-navy dark:text-[#F1F5FB]">Choose a new password</h1>{valid ? <ResetPasswordForm userId={userId!} secret={secret!} /> : <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-[#A8B5C8]">This recovery link is incomplete. Request a new link from <Link href="/forgot-password" className="font-semibold text-brand underline dark:text-blue-400">password recovery</Link>.</p>}</section></main>;
}
