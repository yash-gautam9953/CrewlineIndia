import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BadgeX, ArrowLeft, ShieldAlert } from "lucide-react";
import { verifyPublicCertificate } from "@/lib/certificates";

type Props = { params: Promise<{ certificateId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { certificateId } = await params;
  const result = await verifyPublicCertificate(certificateId);
  return { title: result.status === "valid" ? `Certificate ${result.certificate.certificateId}` : "Certificate verification" };
}

export default async function CertificateVerificationPage({ params }: Props) {
  const { certificateId } = await params;
  const result = await verifyPublicCertificate(certificateId);
  const panel = result.status === "valid" ? {
    icon: BadgeCheck, title: "Certificate verified", color: "border-emerald-200 bg-emerald-50 text-emerald-700",
    body: <dl className="mt-7 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-5">{[["Certificate ID", result.certificate.certificateId], ["Student", result.certificate.studentName], ["Program", result.certificate.internshipTitle], ["Duration", result.certificate.duration], ["Issue date", result.certificate.issueDate], ["Issuing organization", result.certificate.issuer]].map(([label, value]) => <div key={label} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-4"><dt className="text-sm text-slate-500">{label}</dt><dd className="text-sm font-semibold text-navy">{value}</dd></div>)}</dl>,
  } : result.status === "revoked" ? {
    icon: BadgeX, title: "Certificate revoked", color: "border-red-200 bg-red-50 text-red-700", body: <p className="mt-5 text-sm leading-6 text-slate-600">This certificate has been revoked by Crewline and is not valid.</p>,
  } : result.status === "not-found" ? {
    icon: ShieldAlert, title: "Certificate not found", color: "border-amber-200 bg-amber-50 text-amber-800", body: <p className="mt-5 text-sm leading-6 text-slate-600">We could not find a certificate with that ID. Check the ID and try again.</p>,
  } : {
    icon: ShieldAlert, title: "Verification unavailable", color: "border-slate-200 bg-slate-50 text-slate-700", body: <p className="mt-5 text-sm leading-6 text-slate-600">The verification service is not configured or is temporarily unavailable. Please try again later.</p>,
  };
  const Icon = panel.icon;
  return <main className="min-h-[65vh] bg-cloud px-5 py-16 sm:px-8 sm:py-24"><section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-12"><Link href="/verify" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand"><ArrowLeft size={16} /> Verify another certificate</Link><div className={`mt-8 flex items-center gap-3 rounded-2xl border p-5 ${panel.color}`}><Icon size={26} /><h1 className="text-xl font-bold">{panel.title}</h1></div>{panel.body}<p className="mt-6 text-xs leading-5 text-slate-500">Only public certificate details are shown here.</p></section></main>;
}
