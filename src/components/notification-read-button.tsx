"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NotificationReadButton({ notificationId, isRead }: { notificationId: string; isRead: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (isRead) return null;
  async function markRead() {
    setBusy(true);
    try { await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" }); router.refresh(); }
    finally { setBusy(false); }
  }
  return <button type="button" onClick={markRead} disabled={busy} className="mt-2 text-xs font-semibold text-brand underline">{busy ? "Saving…" : "Mark as read"}</button>;
}
