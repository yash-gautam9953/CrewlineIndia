import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { writeAuditLog } from "@/lib/documents/document-service";
import { deadlineReminderEmail, sendCrewlineEmail } from "@/lib/email";

function authorized(request: Request) {
  const secret = process.env.CREWLINE_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied) return false;
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export function isDeadlineWithinReminderWindow(deadlineIso: string, todayIsoDate: string): { eligible: boolean; daysRemaining: number } {
  if (!deadlineIso || !/^\d{4}-\d{2}-\d{2}/.test(deadlineIso)) {
    return { eligible: false, daysRemaining: -1 };
  }
  const deadlineDate = deadlineIso.slice(0, 10);
  const todayMs = Date.parse(`${todayIsoDate}T00:00:00.000Z`);
  const deadlineMs = Date.parse(`${deadlineDate}T00:00:00.000Z`);
  if (!Number.isFinite(todayMs) || !Number.isFinite(deadlineMs)) {
    return { eligible: false, daysRemaining: -1 };
  }
  const daysRemaining = Math.round((deadlineMs - todayMs) / (1000 * 60 * 60 * 24));
  return { eligible: daysRemaining >= 0 && daysRemaining <= 2, daysRemaining };
}

async function runDeadlineReminders(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized scheduled job." }, { status: 401 });
  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Deadline reminder service is not configured." }, { status: 503 });
  const tableId = resources.tables.enrollments;
  const auditTable = resources.tables.auditLogs;

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  let offset = 0;
  let scanned = 0;
  let eligibleCount = 0;
  let remindersSent = 0;
  let skippedDuplicate = 0;
  let skippedDisabled = 0;
  let failed = 0;

  while (true) {
    const page = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId,
      queries: [Query.equal("status", "active"), Query.limit(100), Query.offset(offset)],
    });
    if (!page.rows.length) break;
    scanned += page.rows.length;

    for (const row of page.rows) {
      const enrollment = row as typeof row & Record<string, unknown>;
      const deadlineIso = typeof enrollment.submissionDeadlineAt === "string" ? enrollment.submissionDeadlineAt : "";
      const { eligible, daysRemaining } = isDeadlineWithinReminderWindow(deadlineIso, today);
      if (!eligible) continue;
      eligibleCount += 1;

      if (auditTable) {
        const existing = await service.tablesDB.listRows({
          databaseId: service.databaseId,
          tableId: auditTable,
          queries: [
            Query.equal("resourceType", "enrollment"),
            Query.equal("resourceId", row.$id),
            Query.equal("action", "cron.deadline_reminder_sent"),
            Query.limit(1),
          ],
        }).catch(() => ({ total: 0 }));
        if (existing.total > 0) {
          skippedDuplicate += 1;
          continue;
        }
      }

      const emailResult = await sendCrewlineEmail({
        userId: String(enrollment.studentId),
        subject: "Crewline reminder: Project submission deadline approaching",
        html: deadlineReminderEmail({ deadlineDate: deadlineIso.slice(0, 10), daysRemaining }),
      });

      if (emailResult.sent) {
        remindersSent += 1;
        await writeAuditLog(
          service,
          "system_cron",
          "cron.deadline_reminder_sent",
          row.$id,
          { deadlineDate: deadlineIso.slice(0, 10), daysRemaining, messageId: emailResult.messageId },
          "enrollment"
        );
      } else if (emailResult.skipped) {
        skippedDisabled += 1;
      } else {
        failed += 1;
        await writeAuditLog(
          service,
          "system_cron",
          "cron.deadline_reminder_failed",
          row.$id,
          { reason: emailResult.reason },
          "enrollment"
        );
      }
    }

    if (page.rows.length < 100) break;
    offset += page.rows.length;
  }

  return NextResponse.json({
    status: "ok",
    scanned,
    eligible: eligibleCount,
    remindersSent,
    skippedDuplicate,
    skippedDisabled,
    failed,
  });
}

export async function GET(request: Request) {
  return runDeadlineReminders(request);
}

export async function POST(request: Request) {
  return runDeadlineReminders(request);
}
