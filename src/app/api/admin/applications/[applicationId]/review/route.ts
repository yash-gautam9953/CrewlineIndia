import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";
import { ensureEnrollmentForApprovedApplication } from "@/lib/enrollments";

const schema = z.object({ status: z.enum(["approved", "rejected"]), reason: z.string().trim().max(2000).optional().default("") });

export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  if (isRateLimited(request, "admin-application-review", 30)) return NextResponse.json({ error: "Too many review changes. Try again shortly." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose approve or reject and provide a valid reason." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  if (!service || !tableId) return NextResponse.json({ error: "Application service is not configured." }, { status: 503 });
  const { applicationId } = await params;
  try {
    const application = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId, rowId: applicationId }) as unknown as Record<string, unknown> & { $id: string; studentId: string; internshipId: string };
    if (["sent", "draft"].includes(String(application.offerStatus))) return NextResponse.json({ error: "An offer is already being processed or has been sent." }, { status: 409 });
    if (["withdrawn", "rejected"].includes(String(application.status))) return NextResponse.json({ error: "This application cannot be reviewed in its current state." }, { status: 409 });
    if (application.status === "approved" && parsed.data.status === "rejected") return NextResponse.json({ error: "An approved application cannot be rejected. Manage the enrollment directly from the enrollments dashboard." }, { status: 409 });
    if (parsed.data.status === "approved" && (!application.selectedDuration || !application.requestedStartDate)) return NextResponse.json({ error: "This older application is missing its requested duration or start date. Add the schedule details before approving." }, { status: 409 });

    if (application.status !== parsed.data.status) {
      await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: applicationId, data: { status: parsed.data.status, reviewedBy: admin.$id, reviewedAt: new Date().toISOString(), reviewNote: parsed.data.reason } });
    }

    if (parsed.data.status === "rejected") {
      return NextResponse.json({ reviewed: true, status: "rejected" });
    }

    const enrollment = await ensureEnrollmentForApprovedApplication(application, admin.$id);
    return NextResponse.json({ reviewed: true, status: "approved", enrolled: true, enrollmentCreated: enrollment.created });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    const message = error instanceof Error ? error.message : "Application workflow failed.";
    return NextResponse.json({ error: message }, { status: code === 409 ? 409 : code === 404 ? 404 : 500 });
  }
}
