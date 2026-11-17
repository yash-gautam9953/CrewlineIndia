import type { Metadata } from "next";
import { UserRoundPlus } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create a student account", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return <main className="min-h-[70vh] bg-cloud px-5 py-16 sm:px-8 sm:py-20"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple"><UserRoundPlus size={25} /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-purple">Join Crewline</p><h1 className="mt-3 text-3xl font-bold text-navy">Create a student account</h1><p className="mt-3 leading-7 text-slate-600">Use the same email where you want to receive your internship offer.</p><AuthForm mode="register" /></section></main>;
}
