import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";

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
    const application = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId, rowId: applicationId });
    if (["sent", "draft"].includes(String(application.offerStatus))) return NextResponse.json({ error: "An offer is already being processed or has been sent." }, { status: 409 });
    if (["withdrawn", "rejected"].includes(String(application.status))) return NextResponse.json({ error: "This application cannot be reviewed in its current state." }, { status: 409 });
    await service.tablesDB.updateRow({
      databaseId: service.databaseId,
      tableId,
      rowId: applicationId,
      data: { status: parsed.data.status, reviewedBy: admin.$id, reviewedAt: new Date().toISOString(), reviewNote: parsed.data.reason },
    });
    return NextResponse.json({ reviewed: true, status: parsed.data.status });
  } catch {
    return NextResponse.json({ error: "Application was not found or could not be updated." }, { status: 404 });
  }
}
