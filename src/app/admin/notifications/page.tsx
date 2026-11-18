import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getAdminUser } from "@/lib/authz";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { NotificationReadButton } from "@/components/notification-read-button";

export const metadata: Metadata = { title: "Admin Notifications", robots: { index: false, follow: false } };

export default async function AdminNotificationsPage() {
  if (!await getAdminUser()) redirect("/login?next=%2Fadmin%2Fnotifications");
  const session = await getSessionUser();
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_NOTIFICATIONS_TABLE_ID;
  if (!session || !service || !tableId) throw new Error("Admin notifications are not configured.");
  const notifications = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("userId", session.user.$id), Query.orderDesc("$createdAt"), Query.limit(100)] });
  return <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-4xl"><Link href="/admin" className="text-sm font-semibold text-brand">← Admin overview</Link><h1 className="mt-5 text-3xl font-bold text-navy">Admin notifications</h1>{notifications.rows.length ? <ol className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-5">{notifications.rows.map((row) => <li key={row.$id} className="py-4"><Link href={String(row.targetUrl || "/admin")} className="block"><p className={`text-sm ${row.isRead ? "font-medium text-slate-600" : "font-bold text-navy"}`}>{String(row.title)}</p><p className="mt-1 text-sm text-slate-600">{String(row.body)}</p><time className="mt-1 block text-xs text-slate-400">{new Date(row.$createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</time></Link><NotificationReadButton notificationId={row.$id} isRead={Boolean(row.isRead)} /></li>)}</ol> : <p className="mt-5 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No admin notifications yet.</p>}</div></main>;
}
