import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3, GraduationCap } from "lucide-react";
import { getPublishedInternships } from "@/lib/internships";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { internships } = await getPublishedInternships(25);
  const internship = internships.find((item) => item.slug === slug);
  return { title: internship?.title ?? "Internship program", description: internship?.summary ?? "Explore Crewline internship programs." };
}

export default async function InternshipDetailPage({ params }: Props) {
  const { slug } = await params;
  const { internships } = await getPublishedInternships(25);
  const internship = internships.find((item) => item.slug === slug);
  if (!internship) notFound();

  return <main className="min-h-[70vh] bg-cloud">
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/internships" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand"><ArrowLeft size={16} /> All internships</Link>
      <article className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-gradient-to-br from-navy to-[#1d3157] px-6 py-10 text-white sm:px-12 sm:py-14">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">{internship.domain}</span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{internship.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">{internship.summary}</p>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-200">
            {internship.duration && <span className="inline-flex items-center gap-2"><Clock3 size={16} />{internship.duration}</span>}
            {internship.eligibility && <span className="inline-flex items-center gap-2"><GraduationCap size={17} />{internship.eligibility}</span>}
            {internship.applicationDeadline && <span className="inline-flex items-center gap-2"><CalendarDays size={16} />Apply by {internship.applicationDeadline}</span>}
          </div>
        </header>
        <div className="grid gap-10 p-6 sm:p-12 md:grid-cols-[1fr_280px]">
          <div><h2 className="text-xl font-bold text-navy">About this program</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{internship.summary}</p><p className="mt-8 text-sm leading-6 text-slate-500">Program tasks, learning outcomes, and evaluation criteria will be shown here when available in the published program details.</p></div>
          <aside className="h-fit rounded-2xl border border-slate-200 bg-cloud p-5"><p className="text-sm font-bold text-navy">Ready to apply?</p><p className="mt-2 text-sm leading-6 text-slate-600">Sign in or create a student account to apply for this program.</p><Link href={`/register?program=${encodeURIComponent(internship.slug)}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600">Create an account <ArrowUpRight size={16} /></Link><Link href="/login" className="mt-3 block text-center text-sm font-semibold text-brand">Already have an account?</Link></aside>
        </div>
      </article>
    </div>
  </main>;
}
