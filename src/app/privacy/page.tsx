import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Legal information</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-navy">Privacy policy</h1><div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">This policy needs to be completed and reviewed by Crewline before collecting student information or launching authentication.</div><div className="prose prose-slate mt-8 max-w-none text-sm leading-7"><h2>Information and services</h2><p>The platform is being prepared to use Appwrite for account authentication, program records, submissions, and certificate verification. The final policy must identify the data collected, purposes, retention periods, service providers, and the contact responsible for privacy requests.</p><h2>Before launch</h2><p>Do not use this draft as a published privacy commitment. Confirm Crewline’s legal entity, data practices, retention rules, and privacy contact, then replace this notice with the approved policy.</p></div></main>;
}
