import type { Metadata } from "next";
import Link from "next/link";
import { UserRoundPlus } from "lucide-react";

export const metadata: Metadata = { title: "Create a student account", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return <main className="min-h-[65vh] bg-cloud px-5 py-16 sm:px-8 sm:py-24"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple"><UserRoundPlus size={25} /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-purple">Join Crewline</p><h1 className="mt-3 text-3xl font-bold text-navy">Create your student account</h1><p className="mt-4 leading-7 text-slate-600">Registration will be available once the Appwrite project configuration is connected. Account details will be handled by Appwrite Auth.</p><Link href="/internships" className="mt-7 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600">Explore internships</Link></section></main>;
}
