import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getPublishedInternships } from "@/lib/internships";
import { InternshipCard, InternshipStatus } from "@/components/internship-card";

export const metadata: Metadata = { title: "Explore Internships", description: "Explore Crewline technology internship programs and practical learning opportunities." };

export default async function InternshipsPage({ searchParams }: { searchParams: Promise<{ domain?: string }> }) {
  const [{ domain }, result] = await Promise.all([searchParams, getPublishedInternships(25)]);
  const internships = domain ? result.internships.filter((item) => item.domain.toLowerCase() === domain.toLowerCase()) : result.internships;
  return <main className="min-h-[65vh] bg-cloud dark:bg-[#0B1220]">
    <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151F32]"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Find your next step</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-navy sm:text-5xl dark:text-[#F1F5FB]">Explore internships</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-[#A8B5C8]">Browse technology programs designed around learning, hands-on tasks, and project work.</p></div></section>
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <div className="mb-7 flex items-center gap-2 text-sm text-slate-500 dark:text-[#A8B5C8]"><Search size={16} /><span>{domain ? `Showing programs in ${domain}` : "Published programs"}</span></div>
      {internships.length > 0 ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{internships.map((internship) => <InternshipCard key={internship.id} internship={internship} />)}</div> : <InternshipStatus status={result.status} />}
    </section>
  </main>;
}
