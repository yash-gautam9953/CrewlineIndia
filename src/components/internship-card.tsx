import Link from "next/link";
import { ArrowUpRight, Clock3, GraduationCap, Sparkles } from "lucide-react";
import type { Internship, InternshipResult } from "@/lib/internships";

export function InternshipCard({ internship }: { internship: Internship }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5">
      <div className="flex items-center justify-between"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{internship.domain}</span><Sparkles size={17} className="text-purple" /></div>
      <h3 className="mt-6 text-xl font-bold text-navy">{internship.title}</h3>
      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{internship.summary}</p>
      <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
        {internship.duration && <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{internship.duration}</span>}
        {internship.eligibility && <span className="inline-flex items-center gap-1.5"><GraduationCap size={15} />{internship.eligibility}</span>}
      </div>
      <Link href={`/internships/${encodeURIComponent(internship.slug)}`} className="focus-ring mt-6 inline-flex w-fit items-center gap-2 rounded-lg text-sm font-semibold text-brand hover:text-blue-700">View program <ArrowUpRight size={16} /></Link>
    </article>
  );
}

export function InternshipStatus({ status }: { status: InternshipResult["status"] }) {
  const configured = status !== "not-configured";
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-cloud px-6 py-12 text-center">
    <p className="font-semibold text-navy">{configured ? "No internships are available right now" : "Internship listings are being connected"}</p>
    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{status === "unavailable" ? "We could not load the current programs. Please check back shortly." : status === "not-configured" ? "Program listings will appear here when Crewline’s Appwrite connection is configured." : "Please check back soon for published programs."}</p>
  </div>;
}
