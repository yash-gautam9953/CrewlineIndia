import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { AdminPaymentReviewForm } from "@/components/admin-payment-review-form";
import { AdminPaymentSettings } from "@/components/admin-payment-settings";
import { readPaymentSettings } from "@/lib/payment-settings";

export const metadata: Metadata = { title: "Payment Verification", robots: { index: false, follow: false } };

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fpayments");
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 25;
  const service = createPrivilegedAppwriteClient();
  if (!service) throw new Error("Payment verification is not configured.");
  const { tables } = await getAppwriteResources();
  const paymentsTable = tables.payments;
  const enrollmentsTable = tables.enrollments;
  const profilesTable = tables.studentProfiles;
  const internshipTable = tables.internships;
  const [payments, enrollments, paymentSettings] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentsTable, queries: [Query.orderDesc("createdAt"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.equal("status", ["active", "completed"]), Query.orderDesc("$createdAt"), Query.limit(pageSize), Query.offset((page - 1) * pageSize), Query.select(["$id", "studentId", "internshipId", "status"])] }),
    readPaymentSettings(),
  ]);
  const totalPages = Math.max(1, Math.ceil(enrollments.total / pageSize));

  const studentIds = [...new Set(enrollments.rows.map((row) => String(row.studentId)).filter(Boolean))];
  const internshipIds = [...new Set(enrollments.rows.map((row) => String(row.internshipId)).filter(Boolean))];
  const [profileBatch, internshipBatch] = await Promise.all([
    studentIds.length
      ? service.tablesDB.listRows({
          databaseId: service.databaseId,
          tableId: profilesTable,
          queries: [Query.equal("authUserId", studentIds), Query.limit(studentIds.length), Query.select(["authUserId", "fullName"])],
        }).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
    internshipIds.length
      ? service.tablesDB.listRows({
          databaseId: service.databaseId,
          tableId: internshipTable,
          queries: [Query.equal("$id", internshipIds), Query.limit(internshipIds.length), Query.select(["$id", "title", "domain"])],
        }).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
  ]);

  const profileByUserId = new Map(profileBatch.rows.map((p) => [String(p.authUserId), String(p.fullName ?? "Student")]));
  const programById = new Map(internshipBatch.rows.map((p) => [p.$id, p as typeof p & Record<string, unknown>]));
  const paymentByEnrollmentId = new Map(payments.rows.map((payment) => [String(payment.enrollmentId), payment]));

  const students = enrollments.rows.map((row) => {
    const program = programById.get(String(row.internshipId));
    return {
      id: row.$id,
      studentId: String(row.studentId),
      name: profileByUserId.get(String(row.studentId)) ?? "Student",
      title: String(program?.title ?? "Internship"),
      domain: String(program?.domain ?? ""),
      payment: paymentByEnrollmentId.get(row.$id),
    };
  }).sort((a, b) => {
    const rank = (status: unknown) => (status === "submitted" ? 0 : status === "pending" ? 1 : status === "rejected" ? 2 : 3);
    return rank(a.payment?.status) - rank(b.payment?.status);
  });

  const waiting = payments.rows.filter((row) => row.status === "submitted").length;

  return (
    <main className="min-h-[70vh] bg-cloud px-5 py-10 dark:bg-[#0B1220] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link href="/admin" className="focus-ring rounded text-sm font-semibold text-brand hover:underline dark:text-blue-400">← Admin overview</Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-brand dark:text-blue-400">UPI & Google Form Verification</p>
          <h1 className="mt-2 text-3xl font-bold text-navy dark:text-[#F1F5FB]">Payment Verification</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-[#A8B5C8]">
            Configure your Google Form (UPI scanner) below. When students complete payment and submit their verification request, it appears here and in Project Reviews for final approval.
          </p>
        </div>

        <AdminPaymentSettings initialSettings={paymentSettings} />

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
          {waiting} {waiting === 1 ? "payment verification request is" : "payment verification requests are"} waiting for admin review.
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151F32]">
          <h2 className="text-lg font-bold text-navy dark:text-[#F1F5FB]">Student Payment Requests</h2>
          {students.length ? (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((student) => {
                const payment = student.payment as (typeof student.payment & Record<string, unknown>) | undefined;
                const status = String(payment?.status ?? "pending");
                return (
                  <article key={student.id} className="py-5">
                    <div className="flex flex-col justify-between gap-3 md:flex-row">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-navy dark:text-[#F1F5FB]">{student.name} · {student.title}</p>
                        <p className="mt-1 break-all text-sm text-slate-500 dark:text-[#A8B5C8]">{student.domain} · enrollment {student.id}</p>
                      </div>
                      <span
                        className={`h-fit w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          status === "verified" || status === "waived"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : status === "submitted"
                              ? "bg-amber-100 text-amber-900 font-bold dark:bg-amber-950/60 dark:text-amber-300"
                              : status === "rejected"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {status === "submitted" ? "Verification Requested" : status.replaceAll("_", " ")}
                      </span>
                    </div>
                    {payment && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-[#1C2940]">
                        <p className="text-sm font-semibold text-navy dark:text-[#F1F5FB]">
                          {payment.amountDue ? `${payment.currency} ${payment.amountDue}` : "UPI Google Form Payment"}
                        </p>
                        {Boolean(payment.transactionReference) && (
                          <p className="mt-2 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                            Submitted Transaction / UTR: {String(payment.transactionReference)}
                          </p>
                        )}
                        {Boolean(payment.proofFileId) && (
                          <a className="mt-2 inline-block text-sm font-semibold text-brand underline dark:text-blue-400" href={`/api/payments/${payment.$id}/proof`}>
                            Download payment screenshot / proof
                          </a>
                        )}
                        {Boolean(payment.verificationReason) && (
                          <p className="mt-2 text-sm text-amber-900 dark:text-amber-300">Review note: {String(payment.verificationReason)}</p>
                        )}
                        <AdminPaymentReviewForm paymentId={String(payment.$id)} status={status} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-[#A8B5C8]">No enrollments found.</p>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-[#A8B5C8]">Page {page} of {totalPages} ({enrollments.total} enrollments)</span>
          <div className="flex gap-2">
            <Link aria-disabled={page <= 1} href={`/admin/payments?page=${Math.max(1, page - 1)}`} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600" : "border-slate-200 text-brand dark:border-slate-700 dark:text-blue-400"}`}>Previous</Link>
            <Link aria-disabled={page >= totalPages} href={`/admin/payments?page=${Math.min(totalPages, page + 1)}`} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page >= totalPages ? "pointer-events-none border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600" : "border-slate-200 text-brand dark:border-slate-700 dark:text-blue-400"}`}>Next</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
