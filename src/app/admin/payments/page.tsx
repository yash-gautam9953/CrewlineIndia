import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { AdminPaymentReviewForm } from "@/components/admin-payment-review-form";
import { AdminPaymentSettings } from "@/components/admin-payment-settings";

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
  const [payments, enrollments] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentsTable, queries: [Query.orderDesc("createdAt"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.equal("status", ["active", "completed"]), Query.orderDesc("$createdAt"), Query.limit(pageSize), Query.offset((page - 1) * pageSize)] }),
  ]);
  const totalPages = Math.max(1, Math.ceil(enrollments.total / pageSize));

  const students = (await Promise.all(enrollments.rows.map(async (row) => {
    const [profileRows, program] = await Promise.all([
      service.tablesDB.listRows({ databaseId: service.databaseId, tableId: profilesTable, queries: [Query.equal("authUserId", String(row.studentId)), Query.limit(1)] }),
      service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipTable, rowId: String(row.internshipId) }).catch(() => null),
    ]);
    return { id: row.$id, studentId: String(row.studentId), name: String(profileRows.rows[0]?.fullName ?? "Student"), title: String(program?.title ?? "Internship"), domain: String(program?.domain ?? ""), payment: payments.rows.find((payment) => payment.enrollmentId === row.$id) };
  }))).sort((a, b) => {
    const rank = (status: unknown) => (status === "submitted" ? 0 : status === "pending" ? 1 : status === "rejected" ? 2 : 3);
    return rank(a.payment?.status) - rank(b.payment?.status);
  });

  const waiting = payments.rows.filter((row) => row.status === "submitted").length;

  return (
    <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-brand">UPI & Google Form Verification</p>
          <h1 className="mt-2 text-3xl font-bold text-navy">Payment Verification</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Configure your Google Form (UPI scanner) below. When students complete payment and submit their verification request, it appears here and in Project Reviews for final approval.
          </p>
        </div>

        <AdminPaymentSettings />

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-900">
          {waiting} {waiting === 1 ? "payment verification request is" : "payment verification requests are"} waiting for admin review.
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-navy">Student Payment Requests</h2>
          {students.length ? (
            <div className="mt-4 divide-y divide-slate-100">
              {students.map((student) => {
                const payment = student.payment as (typeof student.payment & Record<string, unknown>) | undefined;
                const status = String(payment?.status ?? "pending");
                return (
                  <article key={student.id} className="py-5">
                    <div className="flex flex-col justify-between gap-3 md:flex-row">
                      <div>
                        <p className="font-semibold text-navy">{student.name} · {student.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{student.domain} · enrollment {student.id}</p>
                      </div>
                      <span
                        className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                          status === "verified" || status === "waived"
                            ? "bg-emerald-50 text-emerald-700"
                            : status === "submitted"
                              ? "bg-amber-100 text-amber-900 font-bold"
                              : status === "rejected"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {status === "submitted" ? "Verification Requested" : status.replaceAll("_", " ")}
                      </span>
                    </div>
                    {payment && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-navy">
                          {payment.amountDue ? `${payment.currency} ${payment.amountDue}` : "UPI Google Form Payment"}
                        </p>
                        {Boolean(payment.transactionReference) && (
                          <p className="mt-2 font-mono text-xs text-slate-700">
                            Submitted Transaction / UTR: {String(payment.transactionReference)}
                          </p>
                        )}
                        {Boolean(payment.proofFileId) && (
                          <a className="mt-2 inline-block text-sm font-semibold text-brand underline" href={`/api/payments/${payment.$id}/proof`}>
                            Download payment screenshot / proof
                          </a>
                        )}
                        {Boolean(payment.verificationReason) && (
                          <p className="mt-2 text-sm text-amber-900">Review note: {String(payment.verificationReason)}</p>
                        )}
                        <AdminPaymentReviewForm paymentId={String(payment.$id)} status={status} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No enrollments found.</p>
          )}
        </section>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Page {page} of {totalPages} ({enrollments.total} enrollments)</span>
          <div className="flex gap-2">
            <Link aria-disabled={page <= 1} href={`/admin/payments?page=${Math.max(1, page - 1)}`} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-brand"}`}>Previous</Link>
            <Link aria-disabled={page >= totalPages} href={`/admin/payments?page=${Math.min(totalPages, page + 1)}`} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page >= totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-brand"}`}>Next</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
