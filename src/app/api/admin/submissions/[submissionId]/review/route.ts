import { NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({ decision: z.enum(["revision_required", "approved", "rejected"]), feedback: z.string().trim().min(5).max(5000), score: z.union([z.literal(""), z.coerce.number().int().min(0).max(10000)]).optional().default("") });

export async function PATCH(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  if (isRateLimited(request, "admin-submission-review", 40)) return NextResponse.json({ error: "Too many review requests. Try again shortly." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choose a review decision and provide meaningful feedback." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const submissionsTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  const reviewsTable = process.env.APPWRITE_REVIEWS_TABLE_ID;
  if (!service || !submissionsTable || !reviewsTable) return NextResponse.json({ error: "Review service is not configured." }, { status: 503 });
  const { submissionId } = await params;
  try {
    const submission = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: submissionsTable, rowId: submissionId });
    if (["approved", "rejected"].includes(String(submission.status))) return NextResponse.json({ error: "This submission already has a final decision." }, { status: 409 });
    const reviewedAt = new Date().toISOString();
    await service.tablesDB.createRow({ databaseId: service.databaseId, tableId: reviewsTable, rowId: ID.unique(), data: { submissionId, reviewerId: admin.$id, feedback: input.data.feedback, score: input.data.score === "" ? null : input.data.score, decision: input.data.decision, reviewedAt } });
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId: submissionsTable, rowId: submissionId, data: { status: input.data.decision } });
    return NextResponse.json({ reviewed: true });
  } catch { return NextResponse.json({ error: "Submission was not found or could not be reviewed." }, { status: 404 }); }
}
