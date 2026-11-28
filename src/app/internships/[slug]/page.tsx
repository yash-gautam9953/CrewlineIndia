import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3, GraduationCap } from "lucide-react";
import { getPublishedInternships } from "@/lib/internships";
import { buttonVariants } from "@/components/ui/button";

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

  return <main className="min-h-[70vh] bg-cloud dark:bg-[#0B1220]">
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/internships" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand dark:text-slate-400 dark:hover:text-blue-400"><ArrowLeft size={16} /> All internships</Link>
      <article className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#151F32]">
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
          <div><h2 className="text-xl font-bold text-navy dark:text-[#F1F5FB]">About this program</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-[#A8B5C8]">{internship.summary}</p>{internship.eligibility && <><h3 className="mt-8 text-base font-bold text-navy dark:text-[#F1F5FB]">Eligibility</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-[#A8B5C8]">{internship.eligibility}</p></>}</div>
          <aside className="h-fit rounded-2xl border border-slate-200 bg-cloud p-5 dark:border-slate-700 dark:bg-[#1C2940]"><p className="text-sm font-bold text-navy dark:text-[#F1F5FB]">Ready to get started?</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-[#A8B5C8]">Enroll directly through Crewline. Your internship schedule is activated immediately, and your official offer letter and domain task will be ready in your dashboard.</p><Link href={`/internships/${encodeURIComponent(internship.slug)}/apply`} className={buttonVariants({ variant: "primary", size: "md", fullWidth: true, className: "mt-5" })}>Enroll in internship <ArrowUpRight size={16} aria-hidden="true" /></Link></aside>
        </div>
      </article>
    </div>
  </main>;
}
