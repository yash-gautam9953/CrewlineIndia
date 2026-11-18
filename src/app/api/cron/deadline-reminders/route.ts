import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { createNotification } from "@/lib/notifications";

const reminderDays = [7, 3, 2, 0];

function crewlineToday(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function wholeCalendarDaysBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function authorized(request: Request) {
  const secret = process.env.CREWLINE_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied) return false;
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized scheduled job." }, { status: 401 });
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  if (!service || !tableId) return NextResponse.json({ error: "Deadline reminder service is not configured." }, { status: 503 });
  const today = crewlineToday(new Date());
  let offset = 0;
  let scanned = 0;
  let notificationsCreated = 0;
  while (true) {
    const page = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("status", "active"), Query.limit(100), Query.offset(offset)] });
    if (!page.rows.length) break;
    scanned += page.rows.length;
    for (const row of page.rows) {
      const enrollment = row as typeof row & Record<string, unknown>;
      if (typeof enrollment.studentId !== "string" || typeof enrollment.submissionDeadlineAt !== "string") continue;
      const dueDate = enrollment.submissionDeadlineAt.slice(0, 10);
      const daysLeft = wholeCalendarDaysBetween(today, dueDate);
      if (!reminderDays.includes(daysLeft)) continue;
      const body = daysLeft === 0
        ? "Your final project submission deadline is today. Submit your project from the Crewline dashboard."
        : `Your final project submission deadline is in ${daysLeft} days. Submit your project from the Crewline dashboard.`;
      const result = await createNotification({ userId: enrollment.studentId, eventKey: `deadline:${row.$id}:${dueDate}:${daysLeft}`, title: daysLeft === 0 ? "Project due today" : `Project deadline in ${daysLeft} days`, body, type: "deadline", targetUrl: "/account" });
      if (result.created) notificationsCreated++;
    }
    if (page.rows.length < 100) break;
    offset += page.rows.length;
  }
  return NextResponse.json({ scanned, notificationsCreated, emailDelivery: process.env.CREWLINE_EMAILS_ENABLED === "true" ? "enabled" : "disabled" });
}
