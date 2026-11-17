import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Student sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <main className="min-h-[70vh] bg-cloud px-5 py-16 sm:px-8 sm:py-20"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand"><LockKeyhole size={25} /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-brand">Student portal</p><h1 className="mt-3 text-3xl font-bold text-navy">Sign in to Crewline</h1><p className="mt-3 leading-7 text-slate-600">View your account and internship applications.</p><AuthForm mode="login" nextPath={next} /><Link href="/internships" className="mt-6 block text-center text-sm font-medium text-slate-500 hover:text-brand">Browse internships</Link></section></main>;
}
