import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckSquare, CreditCard, GraduationCap, Layers3 } from "lucide-react";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";

export const metadata: Metadata = { title: "Admin panel", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?next=%2Fadmin");
  const service = createPrivilegedAppwriteClient();
  if (!service) throw new Error("Admin data tables are not configured.");
  const { tables } = await getAppwriteResources();
  const {
    enrollments: enrollmentsTable,
    internships: internshipsTable,
    submissions: submissionsTable,
    payments: paymentsTable,
  } = tables;

  const [activeEnrollments, programs, pendingSubmissions, pendingPayments] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.equal("status", "active"), Query.limit(1)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: internshipsTable, queries: [Query.equal("publicationStatus", "published"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.equal("status", ["submitted", "under_review"]), Query.orderDesc("submittedAt"), Query.limit(10)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentsTable, queries: [Query.equal("status", "submitted"), Query.orderDesc("createdAt"), Query.limit(10)] }),
  ]);

  const stats = [
    { label: "Active Enrollments", value: activeEnrollments.total, icon: GraduationCap, tone: "bg-blue-50 text-brand", href: "/admin/enrollments" },
    { label: "Pending Project Reviews", value: pendingSubmissions.total, icon: CheckSquare, tone: "bg-amber-50 text-amber-800", href: "/admin/submissions" },
    { label: "Pending Payment Checks", value: pendingPayments.total, icon: CreditCard, tone: "bg-purple-50 text-purple", href: "/admin/payments" },
    { label: "Published Internships", value: programs.total, icon: Layers3, tone: "bg-emerald-50 text-emerald-700", href: "/admin/programs" },
  ];

  return (
    <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-purple">Crewline administration</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">Admin Overview</h1>
            <p className="mt-2 text-sm text-slate-600">Signed in as {admin.email}</p>
          </div>
          <Link
            href="/admin/programs"
            className="admin-btn-primary inline-flex w-fit items-center gap-2 rounded-full bg-[#1769D2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#123B70]"
          >
            Manage Internships & Tasks <ArrowRight size={16} className="text-white" />
          </Link>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
                    <Icon size={18} />
                  </span>
                </div>
                <p className="mt-5 text-3xl font-bold text-navy">{stat.value}</p>
              </Link>
            );
          })}
        </section>

        <section className="mt-7 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-navy">Projects Awaiting Review</h2>
              <Link href="/admin/submissions" className="text-sm font-semibold text-brand">Review all →</Link>
            </div>
            {pendingSubmissions.rows.length ? (
              <div className="divide-y divide-slate-100">
                {pendingSubmissions.rows.map((row) => {
                  const sub = row as typeof row & Record<string, unknown>;
                  return (
                    <Link key={row.$id} href="/admin/submissions" className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy">{String(sub.projectTitle ?? "Project Submission")}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {String(sub.studentName ?? "Student")} · {String(sub.domain ?? "Internship")}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        {String(sub.status).replaceAll("_", " ")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="p-6 text-sm text-slate-500">No projects pending review.</p>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-navy">Payment Verification Queue</h2>
              <Link href="/admin/payments" className="text-sm font-semibold text-brand">Verify payments →</Link>
            </div>
            {pendingPayments.rows.length ? (
              <div className="divide-y divide-slate-100">
                {pendingPayments.rows.map((row) => {
                  const payment = row as typeof row & Record<string, unknown>;
                  return (
                    <Link key={row.$id} href="/admin/payments" className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-bold text-navy">UTR: {String(payment.transactionReference ?? "Submitted")}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">Enrollment {String(payment.enrollmentId ?? "")}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                        Verify payment
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="p-6 text-sm text-slate-500">No payment verification requests waiting.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
