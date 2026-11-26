import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { isRateLimited } from "@/lib/rate-limit";
import { getDocumentsConfig, writeAuditLog } from "@/lib/documents/document-service";

const schema = z.object({ newDeadline: z.iso.date(), reason: z.string().trim().min(10).max(2000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
  if (isRateLimited(request, "deadline-extension", 20)) return NextResponse.json({ error: "Too many deadline changes." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choose a new date and provide a reason of at least 10 characters." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Enrollment schedule is not configured." }, { status: 503 });
  const tableId = resources.tables.enrollments;
  const { enrollmentId } = await params;
  try {
    const enrollment = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId, rowId: enrollmentId }) as Record<string, unknown>;
    if (enrollment.status !== "active") return NextResponse.json({ error: "Only active internship deadlines can be extended." }, { status: 409 });
    const oldDeadline = typeof enrollment.submissionDeadlineAt === "string" ? enrollment.submissionDeadlineAt : "";
    if (!oldDeadline) return NextResponse.json({ error: "This enrollment does not have a submission deadline." }, { status: 409 });
    const newDeadline = `${input.data.newDeadline}T00:00:00.000Z`;
    if (input.data.newDeadline <= oldDeadline.slice(0, 10)) return NextResponse.json({ error: "The extended deadline must be later than the current deadline." }, { status: 400 });
    const extendedAt = new Date().toISOString();
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: enrollmentId, data: { originalSubmissionDeadlineAt: enrollment.originalSubmissionDeadlineAt ?? oldDeadline, submissionDeadlineAt: newDeadline, deadlineExtensionReason: input.data.reason, deadlineExtendedBy: admin.$id, deadlineExtendedAt: extendedAt } });
    const config = await getDocumentsConfig();
    if (config) await writeAuditLog(config, admin.$id, "enrollment.deadline_extended", enrollmentId, { previousDeadline: oldDeadline, newDeadline, reason: input.data.reason }, "enrollment");
    return NextResponse.json({ updated: true, submissionDeadlineAt: newDeadline });
  } catch { return NextResponse.json({ error: "Enrollment deadline could not be updated." }, { status: 404 }); }
}
