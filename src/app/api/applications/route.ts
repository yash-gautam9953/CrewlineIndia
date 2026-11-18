import { NextResponse } from "next/server";
import { ID, Permission, Query, Role } from "node-appwrite";
import { z } from "zod";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { ensureStudentProfile } from "@/lib/student-profile";
import { isRateLimited } from "@/lib/rate-limit";
import { calculateInternshipDates, INTERNSHIP_DURATIONS } from "@/lib/internship-dates";
import { createNotification } from "@/lib/notifications";
import { listAdminUserIds } from "@/lib/authz";

const schema = z.object({
  internshipSlug: z.string().trim().min(1).max(180),
  studentName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(32),
  college: z.string().trim().min(2).max(180),
  course: z.string().trim().min(2).max(160),
  currentYear: z.coerce.number().int().min(1).max(8),
  selectedDuration: z.enum(INTERNSHIP_DURATIONS),
  requestedStartDate: z.iso.date(),
  city: z.string().trim().min(2).max(120),
  statement: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: Request) {
  if (isRateLimited(request, "application-submit", 5)) return NextResponse.json({ error: "Too many applications were submitted. Please wait a minute and try again." }, { status: 429 });
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please sign in to apply." }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Please complete all required application details." }, { status: 400 });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (input.data.requestedStartDate < today) return NextResponse.json({ error: "Choose today or a future internship start date." }, { status: 400 });
  const dates = calculateInternshipDates(input.data.requestedStartDate, input.data.selectedDuration);
  const service = createPrivilegedAppwriteClient();
  const internshipsTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  const applicationsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  if (!service || !internshipsTable || !applicationsTable) return NextResponse.json({ error: "Application service is not configured." }, { status: 503 });

  try {
    const internships = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId: internshipsTable,
      queries: [Query.equal("slug", input.data.internshipSlug), Query.equal("publicationStatus", "published"), Query.limit(1)],
    });
    const internship = internships.rows[0];
    if (!internship) return NextResponse.json({ error: "This internship is not available for applications." }, { status: 404 });

    const duplicates = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId: applicationsTable,
      queries: [Query.equal("studentId", session.user.$id), Query.equal("internshipId", internship.$id), Query.limit(1)],
    });
    if (duplicates.rows.length) return NextResponse.json({ error: "You have already applied for this internship." }, { status: 409 });

    const profile = await ensureStudentProfile(session.user);
    await service.tablesDB.updateRow({
      databaseId: service.databaseId,
      tableId: process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID!,
      rowId: profile.$id,
      data: { fullName: input.data.studentName, email: session.user.email, phone: input.data.phone, college: input.data.college, course: input.data.course, currentYear: input.data.currentYear, city: input.data.city },
    });

    const application = await service.tablesDB.createRow({
      databaseId: service.databaseId,
      tableId: applicationsTable,
      rowId: ID.unique(),
      data: {
        studentId: session.user.$id,
        internshipId: internship.$id,
        domain: internship.domain,
        studentName: input.data.studentName,
        studentEmail: session.user.email,
        phone: input.data.phone,
        college: input.data.college,
        course: input.data.course,
        currentYear: input.data.currentYear,
        city: input.data.city,
        statement: input.data.statement,
        selectedDuration: input.data.selectedDuration,
        requestedStartDate: dates.startAt,
        proposedEndDate: dates.endAt,
        status: "pending",
        offerStatus: "not_prepared",
      },
      permissions: [Permission.read(Role.user(session.user.$id))],
    });
    await createNotification({ userId: session.user.$id, eventKey: `application-submitted:${application.$id}`, title: "Application received", body: "Your Crewline application has been submitted and is awaiting review.", type: "application", targetUrl: "/account" }).catch(() => undefined);
    await Promise.all(listAdminUserIds().map((adminId) => createNotification({ userId: adminId, eventKey: `application-review:${application.$id}:${adminId}`, title: "New internship application", body: `A new ${String(internship.domain)} application is ready for review.`, type: "application", targetUrl: `/admin/applications/${application.$id}` }).catch(() => undefined)));
    return NextResponse.json({ applicationId: application.$id, redirectTo: "/account?applied=1" }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === 409) return NextResponse.json({ error: "You have already applied for this internship." }, { status: 409 });
    return NextResponse.json({ error: "We could not save your application. Please try again." }, { status: 500 });
  }
}
