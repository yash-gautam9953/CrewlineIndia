import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Legal information</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-navy">Terms and conditions</h1><div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">These terms need to be completed and reviewed by Crewline before offering programs or accepting applications.</div><div className="mt-8 text-sm leading-7 text-slate-600"><h2 className="text-lg font-bold text-navy">Program terms</h2><p className="mt-2">The final terms should describe eligibility, application and enrollment conditions, program access, expected learner conduct, evaluation and completion requirements, certificate rules, and complaint handling.</p><h2 className="mt-7 text-lg font-bold text-navy">Before launch</h2><p className="mt-2">Confirm the organization details and actual program policies before publishing final terms. Do not treat this draft as legal advice or a binding policy.</p></div></main>;
}
