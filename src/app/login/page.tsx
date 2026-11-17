import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export const metadata: Metadata = { title: "Student sign in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return <main className="min-h-[65vh] bg-cloud px-5 py-16 sm:px-8 sm:py-24"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand"><LockKeyhole size={25} /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-brand">Student portal</p><h1 className="mt-3 text-3xl font-bold text-navy">Sign in to Crewline</h1><p className="mt-4 leading-7 text-slate-600">Student authentication is being connected to Crewline’s Appwrite project. No account data is stored in this website yet.</p><Link href="/internships" className="mt-7 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600">Browse internships</Link></section></main>;
}
