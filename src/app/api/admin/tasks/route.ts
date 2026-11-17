import { NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({ internshipId: z.string().min(1).max(64), title: z.string().trim().min(3).max(180), instructions: z.string().trim().min(10).max(12000), sequence: z.coerce.number().int().min(1).max(500), dueAt: z.union([z.iso.datetime(), z.literal("")]).optional().default(""), maxScore: z.union([z.literal(""), z.coerce.number().int().min(0).max(10000)]).optional().default(""), isMandatory: z.coerce.boolean().default(true), isPublished: z.coerce.boolean().default(false) });

export async function POST(request: Request) {
  if (isRateLimited(request, "admin-task-create", 30)) return NextResponse.json({ error: "Too many task changes. Try again shortly." }, { status: 429 });
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Provide a task title, instructions, and valid sequence number." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const taskTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const internshipsTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  if (!service || !taskTable || !internshipsTable) return NextResponse.json({ error: "Task service is not configured." }, { status: 503 });
  try {
    await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipsTable, rowId: input.data.internshipId });
    const duplicate = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: taskTable, queries: [Query.equal("internshipId", input.data.internshipId), Query.equal("sequence", input.data.sequence), Query.limit(1)] });
    if (duplicate.total) return NextResponse.json({ error: "That sequence number is already used for this internship." }, { status: 409 });
    const task = await service.tablesDB.createRow({ databaseId: service.databaseId, tableId: taskTable, rowId: ID.unique(), data: { internshipId: input.data.internshipId, title: input.data.title, instructions: input.data.instructions, sequence: input.data.sequence, isMandatory: input.data.isMandatory, dueAt: input.data.dueAt || null, maxScore: input.data.maxScore === "" ? null : input.data.maxScore, isPublished: input.data.isPublished } });
    return NextResponse.json({ id: task.$id }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not save this task." }, { status: 500 }); }
}
