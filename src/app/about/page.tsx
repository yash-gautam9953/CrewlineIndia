import type { Metadata } from "next";
import { ArrowRight, BookOpenCheck, Compass, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "About Crewline", description: "Learn about Crewline’s practical technology learning and internship programs." };

export default function AboutPage() {
  return <main>
    <section className="hero-glow border-b border-slate-100"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">About Crewline</p><h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-navy sm:text-6xl">Learn. Build. Get Recognized.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Crewline helps learners explore technology internships, practice through projects, and share verifiable recognition for completed work.</p></div></section>
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-16 sm:px-8 md:grid-cols-3 md:py-24">{[[Compass, "Explore programs", "Find published internship programs in technology domains."], [BookOpenCheck, "Apply online", "Share your details and track your application in one account."], [ShieldCheck, "Continue directly", "If selected, receive an offer letter and WhatsApp link by email."]].map(([Icon, title, description]) => {const I = Icon as typeof Compass; return <article key={title as string} className="rounded-2xl border border-slate-200 p-7"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-brand"><I size={22} /></span><h2 className="mt-6 text-lg font-bold text-navy">{title as string}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{description as string}</p></article>;})}</section>
    <section className="bg-cloud"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center"><div><h2 className="text-2xl font-bold text-navy">Ready to find a program?</h2><p className="mt-2 text-slate-600">Explore the internships currently published by Crewline.</p></div><Link href="/internships" className="inline-flex items-center gap-2 font-semibold text-brand">Explore internships <ArrowRight size={16} /></Link></div></section>
  </main>;
}
