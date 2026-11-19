import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { ensureStudentProfile } from "@/lib/student-profile";
import { isRateLimited } from "@/lib/rate-limit";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(32).optional().default(""),
  college: z.string().trim().max(180).optional().default(""),
  course: z.string().trim().max(160).optional().default(""),
  currentYear: z.union([z.literal(""), z.coerce.number().int().min(1).max(8)]).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
});

export async function PATCH(request: Request) {
  if (isRateLimited(request, "profile-update", 10)) return NextResponse.json({ error: "Too many changes. Please wait a minute and try again." }, { status: 429 });
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please sign in to update your profile." }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.warn("[account/profile] Profile validation failed:", fieldErrors);
    return NextResponse.json({ error: "Check your profile details and try again.", details: fieldErrors }, { status: 400 });
  }
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID;
  if (!service || !tableId) return NextResponse.json({ error: "Profile storage is not configured." }, { status: 503 });
  try {
    const profile = await ensureStudentProfile(session.user);
    const data = {
      fullName: parsed.data.fullName,
      email: session.user.email,
      phone: parsed.data.phone,
      college: parsed.data.college,
      course: parsed.data.course,
      currentYear: parsed.data.currentYear === "" ? null : parsed.data.currentYear,
      city: parsed.data.city,
    };
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: profile.$id, data });
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "We could not save your profile. Please try again." }, { status: 500 });
  }
}
