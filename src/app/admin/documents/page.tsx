import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { AuthorizedSignatorySettings } from "@/components/authorized-signatory-settings";
import { AdminDocumentIssuer } from "@/components/admin-document-issuer";
import { RevokeDocumentForm } from "@/components/revoke-document-form";

export const metadata: Metadata = { title: "Document management", robots: { index: false, follow: false } };

export default async function AdminDocumentsPage() {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fdocuments");
  const service = createPrivilegedAppwriteClient();
  const docsTable = process.env.APPWRITE_DOCUMENTS_TABLE_ID;
  const appsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const enrollmentsTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const submissionsTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  const programsTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  const tasksTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const reviewsTable = process.env.APPWRITE_REVIEWS_TABLE_ID;
  if (!service || !docsTable || !appsTable || !enrollmentsTable || !submissionsTable || !programsTable || !tasksTable || !reviewsTable) throw new Error("Document management is not configured. Run the repeatable Appwrite setup after reviewing the migration.");
  const [documents, apps, enrollments, submissions, programs] = await Promise.all([
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: docsTable, queries: [Query.orderDesc("issueDate"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: appsTable, queries: [Query.equal("status", "approved"), Query.orderDesc("$createdAt"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.equal("status", "completed"), Query.orderDesc("completedAt"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.equal("status", "approved"), Query.orderDesc("submittedAt"), Query.limit(100)] }),
    service.tablesDB.listRows({ databaseId: service.databaseId, tableId: programsTable, queries: [Query.limit(100)] }),
  ]);
  const issuedEvents = new Set(documents.rows.map((row) => String((row as typeof row & Record<string, unknown>).eventKey ?? "")));
  const programById = new Map(programs.rows.map((row) => [row.$id, row as typeof row & Record<string, unknown>]));
  const existingProjectEvents = new Set(documents.rows.filter((row) => (row as typeof row & Record<string, unknown>).documentType === "project_completion").map((row) => String((row as typeof row & Record<string, unknown>).sourceId)));
  const existingEnrollmentEvents = new Set(documents.rows.filter((row) => (row as typeof row & Record<string, unknown>).documentType === "internship_completion").map((row) => String((row as typeof row & Record<string, unknown>).sourceId)));
  const completedEnrollmentEligibility = await Promise.all(enrollments.rows.map(async (row) => {
    const enrollment = row as typeof row & Record<string, unknown>;
    const mandatoryTasks = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: tasksTable, queries: [Query.equal("internshipId", String(enrollment.internshipId)), Query.equal("isMandatory", true), Query.limit(100)] });
    for (const task of mandatoryTasks.rows) {
      const approved = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.equal("studentId", String(enrollment.studentId)), Query.equal("taskId", task.$id), Query.equal("status", "approved"), Query.limit(1)] });
      if (!approved.total) return { row, eligible: false };
    }
    return { row, eligible: true };
  }));
  const eligibleEnrollments = completedEnrollmentEligibility.filter((item) => item.eligible).map((item) => item.row);
  const approvedReviews = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: reviewsTable, queries: [Query.equal("decision", "approved"), Query.orderDesc("reviewedAt"), Query.limit(100)] });
  const approvedSubmissionIds = new Set(approvedReviews.rows.map((row) => String((row as typeof row & Record<string, unknown>).submissionId)));
  const profileTable = process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID;
  const studentName = async (userId: string, fallback = "Student") => {
    if (!profileTable) return fallback;
    try { const result = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: profileTable, queries: [Query.equal("authUserId", userId), Query.limit(1)] }); return String(result.rows[0]?.fullName ?? fallback); }
    catch { return fallback; }
  };
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl"><Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-brand">Issuance and verification</p><h1 className="mt-2 text-3xl font-bold text-navy">Document Management</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Preview each personalized document and explicitly confirm before issuing. Student, internship and project information is revalidated at confirmation.</p>
    <div className="mt-7"><AuthorizedSignatorySettings /></div>
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="text-xl font-bold text-navy">Eligible document actions</h2><p className="mt-2 text-sm text-slate-600">Offers require an approved application. Internship certificates require a completed enrollment and approved mandatory tasks. Project certificates require a recorded approved review.</p>
      <div className="mt-6 space-y-7"><div><h3 className="mb-3 text-base font-bold text-navy">Offer Letters</h3>{apps.rows.filter((row) => !issuedEvents.has(`offer:${row.$id}`)).length ? <div className="grid gap-3">{apps.rows.filter((row) => !issuedEvents.has(`offer:${row.$id}`)).map(async (row) => {const app = row as typeof row & Record<string, unknown>; const program = programById.get(String(app.internshipId)); return <AdminDocumentIssuer key={row.$id} documentType="offer" sourceId={row.$id} studentName={String(app.studentName ?? await studentName(String(app.studentId)))} title={String(program?.title ?? "Internship")} duration={String(app.offerDuration ?? program?.duration ?? "")} />;})}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No approved applications are waiting for an offer letter.</p>}</div>
      <div><h3 className="mb-3 text-base font-bold text-navy">Internship Completion Certificates</h3>{eligibleEnrollments.filter((row) => !existingEnrollmentEvents.has(row.$id)).length ? <div className="grid gap-3">{eligibleEnrollments.filter((row) => !existingEnrollmentEvents.has(row.$id)).map(async (row) => {const enrollment = row as typeof row & Record<string, unknown>; const program = programById.get(String(enrollment.internshipId)); const name = await studentName(String(enrollment.studentId)); return <AdminDocumentIssuer key={row.$id} documentType="internship_completion" sourceId={row.$id} studentName={name} title={String(program?.title ?? "Internship")} duration={String(program?.duration ?? "")} />;})}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No unissued completed enrollments currently meet the mandatory-task approval check.</p>}</div>
      <div><h3 className="mb-3 text-base font-bold text-navy">Project Completion Certificates</h3>{submissions.rows.filter((row) => approvedSubmissionIds.has(row.$id) && !existingProjectEvents.has(row.$id)).length ? <div className="grid gap-3">{submissions.rows.filter((row) => approvedSubmissionIds.has(row.$id) && !existingProjectEvents.has(row.$id)).map(async (row) => {const submission = row as typeof row & Record<string, unknown>; let taskTitle = "Approved project"; try { const task = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: tasksTable, rowId: String(submission.taskId) }); taskTitle = String(task.title ?? taskTitle); } catch { /* preview will surface missing source details */ } return <AdminDocumentIssuer key={row.$id} documentType="project_completion" sourceId={row.$id} studentName={await studentName(String(submission.studentId))} title={taskTitle} />;})}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No unissued approved projects with an approval review are available.</p>}</div></div>
    </section>
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-6"><h2 className="text-xl font-bold text-navy">Issuance history</h2><p className="mt-1 text-sm text-slate-500">Latest {documents.rows.length} documents</p></div>{documents.rows.length ? <div className="divide-y divide-slate-100">{documents.rows.map((row) => {const doc = row as typeof row & Record<string, unknown>; const typeLabel = doc.documentType === "offer" ? "Offer letter" : doc.documentType === "project_completion" ? "Project certificate" : "Internship certificate"; const canReissue = doc.documentType === "offer" ? doc.status === "valid" : doc.status === "revoked"; return <div key={row.$id} className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-navy">{typeLabel} · {String(doc.studentName)}</p><p className="mt-1 break-all text-xs text-slate-500">{row.$id} · {String(doc.documentTitle)} · {doc.issueDate ? new Date(String(doc.issueDate)).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}</p><p className={`mt-1 text-xs font-semibold ${doc.status === "valid" ? "text-emerald-700" : "text-red-700"}`}>{String(doc.status)}</p><RevokeDocumentForm documentId={row.$id} disabled={doc.status !== "valid" || doc.documentType === "offer"} />{canReissue && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-brand underline">Create authorized reissue</summary><div className="mt-2"><AdminDocumentIssuer documentType={doc.documentType as "offer" | "internship_completion" | "project_completion"} sourceId={String(doc.sourceId)} studentName={String(doc.studentName)} title={String(doc.documentTitle)} duration={String(doc.duration ?? "")} reissueFromId={row.$id} /></div></details>}</div><a href={`/api/documents/${encodeURIComponent(row.$id)}/download`} target="_blank" rel="noreferrer" className="h-fit text-sm font-semibold text-brand underline">View PDF</a></div>;})}</div> : <p className="p-6 text-sm text-slate-500">No documents have been issued.</p>}</section>
  </div></main>;
}
