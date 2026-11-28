import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";

export const metadata: Metadata = { title: "Audit Logs", robots: { index: false, follow: false } };

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Faudit-logs");
  const params = await searchParams;
  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  const tableId = resources?.tables.auditLogs;
  if (!service || !tableId) {
    return (
      <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link>
          <h1 className="mt-4 text-3xl font-bold text-navy">Audit Logs</h1>
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Audit logs table could not be resolved.
          </p>
        </div>
      </main>
    );
  }

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 25;
  const queries = [Query.orderDesc("occurredAt"), Query.limit(pageSize), Query.offset((page - 1) * pageSize)];
  if (params.action?.trim()) {
    queries.push(Query.startsWith("action", params.action.trim().slice(0, 80)));
  }

  const logs = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries });
  const totalPages = Math.max(1, Math.ceil(logs.total / pageSize));

  return (
    <main className="min-h-[70vh] bg-cloud px-5 py-10 dark:bg-[#0B1220] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="focus-ring rounded text-sm font-semibold text-brand hover:underline dark:text-blue-400">← Admin overview</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-brand dark:text-blue-400">Security & Compliance</p>
        <h1 className="mt-2 text-3xl font-bold text-navy dark:text-[#F1F5FB]">Audit Logs</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-[#A8B5C8]">{logs.total} recorded events · page {page} of {totalPages}</p>

        <search>
          <form className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#151F32] sm:flex-row">
            <label htmlFor="audit-action-filter" className="sr-only">Filter action prefix</label>
            <input
              id="audit-action-filter"
              name="action"
              defaultValue={params.action}
              placeholder="Filter action prefix (e.g. document., payment.)"
              className="crew-input focus-ring min-h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"
            />
            <button type="submit" className="admin-btn-primary min-h-10 rounded-lg bg-[#1769D2] px-5 text-sm font-semibold text-white hover:bg-[#123B70]">
              Filter
            </button>
          </form>
        </search>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151F32]">
          <div className="hidden grid-cols-[1.1fr_.9fr_1fr_1.2fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-[#1C2940] dark:text-[#A8B5C8] md:grid">
            <span>Action</span>
            <span>Actor ID</span>
            <span>Resource</span>
            <span>Details</span>
            <span>Timestamp</span>
          </div>
          {logs.rows.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.rows.map((row) => {
                const log = row as typeof row & Record<string, unknown>;
                return (
                  <div key={row.$id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[1.1fr_.9fr_1fr_1.2fr_1fr] md:items-center md:gap-4">
                    <span className="min-w-0 break-all font-mono text-xs font-bold text-navy dark:text-[#F1F5FB]">{String(log.action ?? "")}</span>
                    <span className="min-w-0 break-all font-mono text-xs text-slate-500 dark:text-slate-400 md:truncate">{String(log.actorId ?? "system")}</span>
                    <span className="min-w-0 break-all text-xs text-slate-600 dark:text-[#A8B5C8] md:truncate">
                      {String(log.resourceType ?? "")} · <span className="font-mono">{String(log.resourceId ?? "")}</span>
                    </span>
                    <span className="min-w-0 break-words font-mono text-xs text-slate-500 dark:text-slate-400 md:truncate">{String(log.details ?? "")}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {log.occurredAt ? new Date(String(log.occurredAt)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="p-6 text-sm text-slate-500 dark:text-[#A8B5C8]">No audit logs found.</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-[#A8B5C8]">Showing {logs.rows.length} of {logs.total}</span>
          <div className="flex gap-2">
            <Link
              aria-disabled={page <= 1}
              href={`/admin/audit-logs?page=${Math.max(1, page - 1)}${params.action ? `&action=${encodeURIComponent(params.action)}` : ""}`}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600" : "border-slate-200 text-brand dark:border-slate-700 dark:text-blue-400"}`}
            >
              Previous
            </Link>
            <Link
              aria-disabled={page >= totalPages}
              href={`/admin/audit-logs?page=${Math.min(totalPages, page + 1)}${params.action ? `&action=${encodeURIComponent(params.action)}` : ""}`}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${page >= totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-brand"}`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
