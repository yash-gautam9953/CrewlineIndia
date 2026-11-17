import type { Metadata } from "next";
import Link from "next/link";
import { VerifyEmailForm } from "@/components/verify-email-form";

export const metadata: Metadata = { title: "Verify email address", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ userId?: string; secret?: string }> }) {
  const { userId = "", secret = "" } = await searchParams;
  const valid = Boolean(userId && userId.length <= 64 && secret && secret.length <= 512);
  return <main className="min-h-[65vh] bg-cloud px-5 py-16 sm:px-8 sm:py-24"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Account security</p><h1 className="mt-3 text-3xl font-bold text-navy">Verify your email</h1><p className="mt-3 leading-7 text-slate-600">Confirm ownership of the email address connected to your Crewline account.</p>{valid ? <VerifyEmailForm userId={userId} secret={secret} /> : <p className="mt-6 text-sm text-slate-600">This verification link is incomplete. Request a new one from your <Link href="/account" className="font-semibold text-brand">student account</Link>.</p>}</section></main>;
}
