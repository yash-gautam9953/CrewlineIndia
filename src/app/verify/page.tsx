import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { CertificateSearch } from "@/components/certificate-search";

export const metadata: Metadata = { title: "Verify a Certificate", description: "Check the status of a Crewline certificate." };

export default function VerifyPage() {
  return <main className="min-h-[65vh] bg-cloud dark:bg-[#0B1220] px-5 py-16 sm:px-8 sm:py-24">
    <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-12 dark:border-slate-800 dark:bg-[#151F32]">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand dark:bg-blue-950/60 dark:text-blue-400"><ShieldCheck size={26} /></span>
      <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-brand">Credential check</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl dark:text-[#F1F5FB]">Verify a Crewline certificate</h1>
      <p className="mt-4 leading-7 text-slate-600 dark:text-[#A8B5C8]">Enter the certificate ID to check its status and the public details recorded by Crewline.</p>
      <CertificateSearch />
      <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">Verification is read-only. This page does not display contact details, internal student IDs, or project submissions.</p>
    </section>
  </main>;
}
