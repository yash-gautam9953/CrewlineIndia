import "server-only";
import { ID, Messaging, Permission, Query, Role } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export async function createNotification(input: { userId: string; eventKey: string; title: string; body: string; type: string; targetUrl?: string; sendEmail?: boolean }) {
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_NOTIFICATIONS_TABLE_ID;
  if (!service || !tableId) return { created: false, reason: "not-configured" as const };
  const existing = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("eventKey", input.eventKey), Query.limit(1)] });
  if (existing.rows[0]) return { created: false, row: existing.rows[0] };
  let row: { $id: string; [key: string]: unknown };
  try {
    const createdRow = await service.tablesDB.createRow({
      databaseId: service.databaseId,
      tableId,
      rowId: ID.unique(),
      data: { userId: input.userId, title: input.title, body: input.body, type: input.type, targetUrl: input.targetUrl ?? null, isRead: false, readAt: null, eventKey: input.eventKey, emailStatus: "not_sent", emailMessageId: null },
      permissions: [Permission.read(Role.user(input.userId))],
    });
    row = createdRow as unknown as typeof row;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === 409) return { created: false, reason: "duplicate" as const };
    throw error;
  }

  if (input.sendEmail === false || process.env.CREWLINE_EMAILS_ENABLED !== "true") return { created: true, row, emailStatus: "disabled" as const };
  try {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const link = input.targetUrl && baseUrl ? `\n\nOpen Crewline: ${baseUrl}${input.targetUrl}` : "";
    const message = await new Messaging(service.client).createEmail({ messageId: ID.unique(), subject: `Crewline: ${input.title}`.replace(/[\r\n]+/g, " ").slice(0, 180), content: `${input.body}${link}`, users: [input.userId], html: false });
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: row.$id, data: { emailStatus: "sent", emailMessageId: message.$id } });
    return { created: true, row, emailStatus: "sent" as const };
  } catch {
    try { await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: row.$id, data: { emailStatus: "failed" } }); } catch { /* keep notification visible in dashboard */ }
    return { created: true, row, emailStatus: "failed" as const };
  }
}

