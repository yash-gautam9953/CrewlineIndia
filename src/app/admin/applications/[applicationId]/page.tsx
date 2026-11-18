import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone, UserRound } from "lucide-react";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { OfferLetterForm } from "@/components/offer-letter-form";
import { ApplicationReviewActions } from "@/components/application-review-actions";
import { formatCrewlineDate } from "@/lib/internship-dates";

type Props = { params: Promise<{ applicationId: string }> };
export const metadata: Metadata = { title: "Review application", robots: { index: false, follow: false } };

export default async function AdminApplicationPage({ params }: Props) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fapplications");
  const { applicationId } = await params;
  const service = createPrivilegedAppwriteClient();
  const applicationsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const internshipsTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  if (!service || !applicationsTable || !internshipsTable) throw new Error("Application tables are not configured.");
  let application: Record<string, unknown>;
  let program: Record<string, unknown>;
  try {
    const applicationRow = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: applicationsTable, rowId: applicationId });
    const programRow = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipsTable, rowId: String(applicationRow.internshipId) });
    application = applicationRow as typeof application;
    program = programRow as typeof program;
  } catch { notFound(); }
  const offerStatus = String(application.offerStatus ?? "not_prepared");
  const offerLocked = offerStatus === "sent" || offerStatus === "draft";
  const facts: [string, unknown, typeof Mail | null][] = [["Email", application.studentEmail, Mail], ["Phone / WhatsApp", application.phone, Phone], ["College", application.college, null], ["Course", application.course, null], ["Current year", application.currentYear, null], ["City", application.city, null], ["Selected duration", application.selectedDuration, null], ["Requested start date", formatCrewlineDate(typeof application.requestedStartDate === "string" ? application.requestedStartDate : ""), null], ["Proposed end date", formatCrewlineDate(typeof application.proposedEndDate === "string" ? application.proposedEndDate : ""), null], ["Applied", new Date(String(application.$createdAt)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }), null]];
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-5xl">
    <Link href="/admin/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft size={16} /> All applications</Link>
    <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Application review</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">{String(application.studentName ?? "Student")}</h1><p className="mt-2 text-slate-600">{String(program.domain ?? "")} · {String(program.title ?? "Internship")}</p></div><span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{String(application.status ?? "pending")} · {offerStatus.replaceAll("_", " ")}</span></div>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-brand"><UserRound size={19} /></span><h2 className="text-lg font-bold text-navy">Student application details</h2></div><dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">{facts.map(([label, value, Icon]) => <div key={label} className="border-b border-slate-100 pb-3"><dt className="flex items-center gap-2 text-xs font-medium text-slate-500">{Icon && <Icon size={14} />}{label}</dt><dd className="mt-1 text-sm font-semibold text-navy">{value ? String(value) : "Not provided"}</dd></div>)}</dl>{Boolean(application.statement) && <div className="mt-5 rounded-xl bg-cloud p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student note</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{String(application.statement)}</p></div>}</section>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Application decision</p><h2 className="mt-2 text-xl font-bold text-navy">Review this application</h2><p className="mt-2 text-sm leading-6 text-slate-600">Approve the application before preparing an offer. Rejection reasons are stored for administrator reference.</p><ApplicationReviewActions applicationId={applicationId} status={String(application.status ?? "pending")} reviewNote={String(application.reviewNote ?? "")} /></section>
    {application.status === "approved" && <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Offer email</p><h2 className="mt-2 text-xl font-bold text-navy">Prepare offer and WhatsApp next step</h2><p className="mt-2 mb-6 text-sm leading-6 text-slate-600">The email will go to this applicant’s registered account email with a personalized PDF offer letter and your WhatsApp link. The remaining process continues outside Crewline.</p><OfferLetterForm applicationId={applicationId} defaultDuration={String(application.selectedDuration ?? "")} defaultStartDate={typeof application.requestedStartDate === "string" ? application.requestedStartDate.slice(0, 10) : ""} defaultMode={String(application.offerMode ?? "remote")} defaultStipend={String(application.offerStipend ?? "")} defaultWhatsappLink={String(application.whatsappLink ?? "")} defaultGoogleFormLink={String(application.googleFormLink ?? "")} defaultNotes={String(application.offerNotes ?? "")} alreadySent={offerLocked} /></section>}
  </div></main>;
}
