import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export async function PATCH(_request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to update notifications." }, { status: 401 });
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_NOTIFICATIONS_TABLE_ID;
  if (!service || !tableId) return NextResponse.json({ error: "Notifications are not configured." }, { status: 503 });
  const { notificationId } = await params;
  try {
    const row = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId, rowId: notificationId });
    if (row.userId !== session.user.$id) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    if (!row.isRead) await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: notificationId, data: { isRead: true, readAt: new Date().toISOString() } });
    return NextResponse.json({ read: true });
  } catch { return NextResponse.json({ error: "Notification not found." }, { status: 404 }); }
}
