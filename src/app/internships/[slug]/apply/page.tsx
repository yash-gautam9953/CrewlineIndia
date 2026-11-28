import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedInternships } from "@/lib/internships";
import { getSessionUser } from "@/lib/appwrite/session";
import { ensureStudentProfile } from "@/lib/student-profile";
import { ApplicationForm } from "@/components/application-form";

type Props = { params: Promise<{ slug: string }> };
export const metadata: Metadata = { title: "Apply for an Internship", robots: { index: false, follow: false } };

export default async function ApplyPage({ params }: Props) {
  const { slug } = await params;
  const [session, internships] = await Promise.all([getSessionUser(), getPublishedInternships(25)]);
  const internship = internships.internships.find((item) => item.slug === slug);
  if (!internship) notFound();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/internships/${slug}/apply`)}`);
  const profile = await ensureStudentProfile(session.user);
  return <main className="min-h-[70vh] bg-cloud dark:bg-[#0B1220] px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-3xl"><Link href={`/internships/${encodeURIComponent(slug)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand dark:text-slate-400 dark:hover:text-blue-400"><ArrowLeft size={16} /> Back to program</Link><section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-[#151F32]"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Instant Internship Enrollment</p><h1 className="mt-3 text-3xl font-bold text-navy dark:text-[#F1F5FB]">Enroll in {internship.title}</h1><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-[#A8B5C8]">{internship.domain} · {internship.duration}. Complete your details below to activate your enrollment immediately and receive your offer letter.</p><div className="mt-8"><ApplicationForm internshipSlug={internship.slug} studentName={String(profile.fullName ?? session.user.name)} studentEmail={session.user.email} profile={profile as Record<string, unknown>} /></div></section></div></main>;
}
