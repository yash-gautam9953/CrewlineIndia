import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";

export const metadata: Metadata = { title: "Contact Crewline", description: "Contact Crewline about programs and certificates." };

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return <main className="min-h-[65vh] bg-cloud px-5 py-16 dark:bg-[#0B1220] sm:px-8 sm:py-24"><section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#151F32] sm:p-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand dark:text-blue-400">Contact</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-navy dark:text-[#F1F5FB]">Talk to Crewline</h1><p className="mt-4 leading-7 text-slate-600 dark:text-[#A8B5C8]">For questions about internship programs or certificate verification, reach out using the contact information configured for Crewline.</p>{email ? <a href={`mailto:${email}`} className="focus-ring mt-7 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-navy hover:border-blue-300 dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB] dark:hover:border-blue-700"><Mail size={18} className="text-brand dark:text-blue-400" />{email}</a> : <div className="mt-7 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"><MessageCircle size={18} className="mt-0.5 shrink-0" />Contact details have not been configured yet.</div>}</section></main>;
}
