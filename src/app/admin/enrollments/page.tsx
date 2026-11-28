import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { formatCrewlineDate } from "@/lib/internship-dates";
import { DeadlineExtensionForm } from "@/components/deadline-extension-form";
import { EnrollmentCompleteForm } from "@/components/enrollment-complete-form";

export const metadata: Metadata = { title: "Enrollment Management", robots: { index: false, follow: false } };

export default async function AdminEnrollmentsPage({ searchParams }: { searchParams: Promise<{ domain?: string; status?: string; page?: string }> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fenrollments");
  const filters = await searchParams;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const pageSize = 25;
  const service = createPrivilegedAppwriteClient();
  if (!service) throw new Error("Enrollment management is not configured.");
  const { tables } = await getAppwriteResources();
  const enrollmentsTable = tables.enrollments;
  const profilesTable = tables.studentProfiles;
  const internshipsTable = tables.internships;
  const tasksTable = tables.tasks;
  const submissionsTable = tables.submissions;
  const paymentTable = tables.payments;
  const assignmentsTable = tables.taskAssignments;
  const enrollmentQueries = [Query.orderDesc("$createdAt"), Query.limit(pageSize), Query.offset((page - 1) * pageSize)];
  if (["active", "completed", "withdrawn", "suspended"].includes(filters.status ?? "")) {
    enrollmentQueries.push(Query.equal("status", filters.status!));
  }
  const [enrollments, programs, tasks, submissions, payments] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: enrollmentQueries }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: internshipsTable, queries: [Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: tasksTable, queries: [Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.orderDesc("submittedAt"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: paymentTable, queries: [Query.limit(100)] }),
  ]);
  const totalPages = Math.max(1, Math.ceil(enrollments.total / pageSize));
  const programById = new Map(programs.rows.map((row) => [row.$id, row as typeof row & Record<string, unknown>]));
  const options = [...new Set(programs.rows.map((row) => String((row as typeof row & Record<string, unknown>).domain ?? "")).filter(Boolean))].sort();
  const filtered = enrollments.rows.filter((row) => {
    const item = row as typeof row & Record<string, unknown>;
    const program = programById.get(String(item.internshipId));
    return (!filters.domain || program?.domain === filters.domain) && (!filters.status || item.status === filters.status);
  });
  const studentIds = [...new Set(filtered.map((row) => String((row as typeof row & Record<string, unknown>).studentId)).filter(Boolean))];
  const allSelectedTaskIds = [...new Set(
    tasks.rows
      .filter((task) => task.isMandatory && task.isPublished && (task as typeof task & Record<string, unknown>).assignmentMode === "selected_students")
      .map((task) => task.$id),
  )];
  const [profileBatch, assignmentBatch] = await Promise.all([
    studentIds.length
      ? service.tablesDB.listRows({
          databaseId: service.databaseId,
          tableId: profilesTable,
          queries: [Query.equal("authUserId", studentIds), Query.limit(studentIds.length), Query.select(["authUserId", "fullName"])],
        }).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
    assignmentsTable && allSelectedTaskIds.length && studentIds.length
      ? service.tablesDB.listRows({
          databaseId: service.databaseId,
          tableId: assignmentsTable,
          queries: [Query.equal("studentId", studentIds), Query.equal("taskId", allSelectedTaskIds), Query.limit(200)],
        }).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
  ]);
  const profileByUserId = new Map(profileBatch.rows.map((p) => [String(p.authUserId), String(p.fullName ?? "Student")]));
  const assignedByStudent = new Map<string, Set<string>>();
  for (const item of assignmentBatch.rows) {
    const sid = String(item.studentId);
    const set = assignedByStudent.get(sid) ?? new Set<string>();
    set.add(String(item.taskId));
    assignedByStudent.set(sid, set);
  }
  const paymentByEnrollmentId = new Map(payments.rows.map((item) => [String(item.enrollmentId), item as typeof item & Record<string, unknown>]));

  const students = filtered.map((row) => {
    const enrollment = row as typeof row & Record<string, unknown>;
    const program = programById.get(String(enrollment.internshipId));
    const programTasks = tasks.rows.filter((task) => task.internshipId === enrollment.internshipId && task.isMandatory && task.isPublished);
    const assignedSelectedIds = assignedByStudent.get(String(enrollment.studentId)) ?? new Set<string>();
    const requiredTasks = programTasks.filter((task) => (task as typeof task & Record<string, unknown>).assignmentMode !== "selected_students" || assignedSelectedIds.has(task.$id));
    const approvedTaskIds = new Set(
      submissions.rows
        .filter((submission) => submission.enrollmentId === enrollment.$id && submission.status === "approved")
        .map((submission) => String(submission.taskId)),
    );
    const payment = paymentByEnrollmentId.get(enrollment.$id);
    const approvedCount = requiredTasks.filter((task) => approvedTaskIds.has(task.$id)).length;
    const paymentStatus = String(payment?.status ?? "not_applicable");
    const paymentAllowed = ["not_applicable", "verified", "waived"].includes(paymentStatus);
    const canComplete = enrollment.status === "active" && requiredTasks.length > 0 && approvedCount === requiredTasks.length && paymentAllowed;
    return { enrollment, name: profileByUserId.get(String(enrollment.studentId)) ?? "Student", program, totalTasks: requiredTasks.length, approvedCount, paymentStatus, paymentAllowed, canComplete };
  });
  return <main className="min-h-[70vh] bg-cloud dark:bg-[#0B1220] px-4 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-semibold text-brand dark:text-blue-400">← Admin overview</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-brand">Student lifecycle</p><h1 className="mt-2 text-2xl font-bold text-navy sm:text-3xl dark:text-[#F1F5FB]">Enrollment Management</h1><p className="mt-2 text-slate-600 dark:text-[#A8B5C8]">Schedules, project progress, payment status, and deadline extensions.</p>
    <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:flex md:items-end dark:border-slate-800 dark:bg-[#151F32]"><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Domain<select name="domain" defaultValue={filters.domain ?? ""} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy md:w-auto dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"><option value="">All domains</option>{options.map((domain) => <option key={domain}>{domain}</option>)}</select></label><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status<select name="status" defaultValue={filters.status ?? ""} className="focus-ring mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy md:w-auto dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"><option value="">All statuses</option>{["active", "completed", "withdrawn", "suspended"].map((status) => <option key={status}>{status}</option>)}</select></label><button className="admin-btn-primary min-h-10 rounded-lg bg-[#1769D2] px-5 text-sm font-semibold text-white border-transparent hover:bg-[#123B70] sm:col-span-2 md:col-span-1">Filter</button></form>
    <section className="mt-6 space-y-4">{students.length ? students.map(({ enrollment, name, program, totalTasks, approvedCount, paymentStatus, paymentAllowed, canComplete }) => {
      const data = enrollment as Record<string, unknown>;
      return <article key={enrollment.$id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#151F32]">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-lg font-bold text-navy dark:text-[#F1F5FB]">{name} · {String(program?.title ?? "Internship")}</p><p className="mt-1 text-sm text-slate-500 dark:text-[#A8B5C8]">{String(program?.domain ?? "")} · {String(data.selectedDuration ?? "Duration missing")} · {String(data.status)}</p><p className="mt-1 break-all font-mono text-xs text-slate-400">Student ID: {String(data.studentId)}</p></div><span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Tasks approved {approvedCount}/{totalTasks}</span></div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs text-slate-500 dark:text-slate-400">Start</dt><dd className="mt-1 text-sm font-medium text-navy dark:text-[#F1F5FB]">{formatCrewlineDate(String(data.startedAt ?? ""))}</dd></div><div><dt className="text-xs text-slate-500 dark:text-slate-400">Planned end</dt><dd className="mt-1 text-sm font-medium text-navy dark:text-[#F1F5FB]">{formatCrewlineDate(String(data.scheduledEndAt ?? ""))}</dd></div><div><dt className="text-xs text-slate-500 dark:text-slate-400">Project deadline</dt><dd className="mt-1 text-sm font-medium text-navy dark:text-[#F1F5FB]">{formatCrewlineDate(String(data.submissionDeadlineAt ?? ""))}<DeadlineExtensionForm enrollmentId={enrollment.$id} currentDeadline={String(data.submissionDeadlineAt ?? "")} /></dd></div><div><dt className="text-xs text-slate-500 dark:text-slate-400">Payment</dt><dd className="mt-1 text-sm font-medium text-navy dark:text-[#F1F5FB]">{paymentStatus.replaceAll("_", " ")}</dd><Link className="mt-1 inline-block text-xs font-semibold text-brand underline dark:text-blue-400" href="/admin/payments">Manage payment</Link></div></dl>
        {data.status === "completed" ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Completion recorded. Certificate eligibility is available in Document Management.</p> : canComplete ? <EnrollmentCompleteForm enrollmentId={enrollment.$id} /> : <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Completion waits for all assigned mandatory tasks to be approved and any disclosed payment to be verified or waived{!paymentAllowed ? ` (payment: ${paymentStatus.replaceAll("_", " ")})` : "."}</p>}
      </article>;
    }) : <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#151F32] dark:text-slate-400">No enrollments match these filters.</div>}</section>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500 dark:text-[#A8B5C8]">Page {page} of {totalPages} ({enrollments.total} total)</span><div className="flex gap-2"><Link aria-disabled={page <= 1} href={`/admin/enrollments?page=${Math.max(1, page - 1)}${filters.domain ? `&domain=${encodeURIComponent(filters.domain)}` : ""}${filters.status ? `&status=${encodeURIComponent(filters.status)}` : ""}`} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600" : "border-slate-200 text-brand dark:border-slate-700 dark:text-blue-400"}`}>Previous</Link><Link aria-disabled={page >= totalPages} href={`/admin/enrollments?page=${Math.min(totalPages, page + 1)}${filters.domain ? `&domain=${encodeURIComponent(filters.domain)}` : ""}${filters.status ? `&status=${encodeURIComponent(filters.status)}` : ""}`} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page >= totalPages ? "pointer-events-none border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600" : "border-slate-200 text-brand dark:border-slate-700 dark:text-blue-400"}`}>Next</Link></div></div>
    </div></main>;
}
