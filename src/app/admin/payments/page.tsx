import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { AdminPaymentRequestForm } from "@/components/admin-payment-request-form";
import { AdminPaymentReviewForm } from "@/components/admin-payment-review-form";

export const metadata: Metadata = { title: "Payment Verification", robots: { index: false, follow: false } };

export default async function AdminPaymentsPage() {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fpayments");
  const service = createPrivilegedAppwriteClient();
  const paymentsTable = process.env.APPWRITE_PAYMENTS_TABLE_ID;
  const enrollmentsTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const profilesTable = process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID;
  const internshipTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  if (!service || !paymentsTable || !enrollmentsTable || !profilesTable || !internshipTable) throw new Error("Payment verification is not configured.");
  const [payments, enrollments] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentsTable, queries: [Query.orderDesc("createdAt"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.equal("status", ["active", "completed"]), Query.orderDesc("$createdAt"), Query.limit(100)] }),
  ]);
  const students = await Promise.all(enrollments.rows.map(async (row) => {
    const [profileRows, program] = await Promise.all([
      service.tablesDB.listRows({ databaseId: service.databaseId, tableId: profilesTable, queries: [Query.equal("authUserId", String(row.studentId)), Query.limit(1)] }),
      service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipTable, rowId: String(row.internshipId) }).catch(() => null),
    ]);
    return { id: row.$id, studentId: String(row.studentId), name: String(profileRows.rows[0]?.fullName ?? "Student"), title: String(program?.title ?? "Internship"), domain: String(program?.domain ?? ""), payment: payments.rows.find((payment) => payment.enrollmentId === row.$id) };
  }));
  const waiting = payments.rows.filter((row) => row.status === "submitted").length;
  return <main className="min-h-[70vh] bg-cloud dark:bg-[#0B1220] px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-semibold text-brand dark:text-blue-400">← Admin overview</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-brand">Independent review</p><h1 className="mt-2 text-3xl font-bold text-navy dark:text-[#F1F5FB]">Payment Verification</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-[#A8B5C8]">No payment is required unless Crewline has disclosed a fee and an admin explicitly creates a payment request. Payment verification is separate from project review and certificate eligibility.</p><div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">{waiting} payment submissions awaiting review.</div>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151F32]"><h2 className="text-lg font-bold text-navy dark:text-[#F1F5FB]">Enrollments and payment requests</h2>{students.length ? <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{students.map((student) => {const payment = student.payment as (typeof student.payment & Record<string, unknown>) | undefined; return <article key={student.id} className="py-5"><div className="flex flex-col justify-between gap-3 md:flex-row"><div><p className="font-semibold text-navy dark:text-[#F1F5FB]">{student.name} · {student.title}</p><p className="mt-1 text-sm text-slate-500 dark:text-[#A8B5C8]">{student.domain} · enrollment {student.id}</p></div><span className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold ${payment?.status === "verified" || payment?.status === "not_applicable" || payment?.status === "waived" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : payment?.status === "submitted" ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{String(payment?.status ?? "no record").replaceAll("_", " ")}</span></div>{payment ? <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-[#1C2940]"><p className="text-sm font-semibold text-navy dark:text-[#F1F5FB]">{payment.amountDue ? `${payment.currency} ${payment.amountDue}` : "No amount due"}</p>{payment.paymentInstructions && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-[#A8B5C8]">{String(payment.paymentInstructions)}</p>}{payment.transactionReference && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Transaction: {String(payment.transactionReference)}</p>}{payment.proofFileId && <a className="mt-2 inline-block text-sm font-semibold text-brand underline dark:text-blue-400" href={`/api/payments/${payment.$id}/proof`}>Download private proof</a>}{payment.verificationReason && <p className="mt-2 text-sm text-amber-900 dark:text-amber-300">Review note: {String(payment.verificationReason)}</p>}<AdminPaymentReviewForm paymentId={String(payment.$id)} status={String(payment.status)} /></div> : null}{(!payment || payment.status === "not_applicable" || payment.status === "rejected") && <div className="mt-3"><AdminPaymentRequestForm enrollmentId={student.id} studentName={student.name} /></div>}</article>;})}</div> : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No enrollments found.</p>}</section>
    </div></main>;
}
