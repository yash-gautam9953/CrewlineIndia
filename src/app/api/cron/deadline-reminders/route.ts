import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

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
  let offset = 0;
  let scanned = 0;
  while (true) {
    const page = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("status", "active"), Query.limit(100), Query.offset(offset)] });
    if (!page.rows.length) break;
    scanned += page.rows.length;
    if (page.rows.length < 100) break;
    offset += page.rows.length;
  }
  return NextResponse.json({ scanned, remindersProcessed: 0, status: "ok" });
}
