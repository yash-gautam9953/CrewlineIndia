import { NextResponse } from "next/server";
import { ID, Permission, Query, Role } from "node-appwrite";
import { z } from "zod";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { ensureStudentProfile } from "@/lib/student-profile";
import { isRateLimited } from "@/lib/rate-limit";
import { calculateInternshipDates, INTERNSHIP_DURATIONS } from "@/lib/internship-dates";
import { ensureEnrollmentForApprovedApplication } from "@/lib/enrollments";
import { autoIssueOfferLetterForApplication } from "@/lib/documents/document-service";

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
  if (isRateLimited(request, "application-submit", 5)) {
    return NextResponse.json({ error: "Too many enrollments were submitted. Please wait a minute and try again." }, { status: 429 });
  }
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please sign in to enroll." }, { status: 401 });

  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Please complete all required enrollment details." }, { status: 400 });

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (input.data.requestedStartDate < today) {
    return NextResponse.json({ error: "Choose today or a future internship start date." }, { status: 400 });
  }

  const dates = calculateInternshipDates(input.data.requestedStartDate, input.data.selectedDuration);
  const service = createPrivilegedAppwriteClient();
  const internshipsTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  const applicationsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  if (!service || !internshipsTable || !applicationsTable) {
    return NextResponse.json({ error: "Enrollment service is not configured." }, { status: 503 });
  }

  try {
    const internships = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId: internshipsTable,
      queries: [Query.equal("slug", input.data.internshipSlug), Query.equal("publicationStatus", "published"), Query.limit(1)],
    });
    const internship = internships.rows[0];
    if (!internship) return NextResponse.json({ error: "This internship domain is not currently available for enrollment." }, { status: 404 });

    const duplicates = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId: applicationsTable,
      queries: [Query.equal("studentId", session.user.$id), Query.equal("internshipId", internship.$id), Query.limit(1)],
    });
    if (duplicates.rows.length) {
      return NextResponse.json({ error: "You have already enrolled in this internship program." }, { status: 409 });
    }

    const profile = await ensureStudentProfile(session.user);
    await service.tablesDB.updateRow({
      databaseId: service.databaseId,
      tableId: process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID!,
      rowId: profile.$id,
      data: {
        fullName: input.data.studentName,
        email: session.user.email,
        phone: input.data.phone,
        college: input.data.college,
        course: input.data.course,
        currentYear: input.data.currentYear,
        city: input.data.city,
      },
    });

    const now = new Date().toISOString();
    // Instant enrollment: create application pre-approved so that manual review is bypassed
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
        status: "approved",
        offerStatus: "draft",
        offerStartDate: dates.startAt,
        offerDuration: input.data.selectedDuration,
        offerMode: "remote",
        reviewedBy: "system_auto_enrollment",
        reviewedAt: now,
        reviewNote: "Automatic enrollment on student registration",
      },
      permissions: [Permission.read(Role.user(session.user.$id))],
    });

    // 1. Create immediate active enrollment & auto-assign published domain task
    const enrollmentResult = await ensureEnrollmentForApprovedApplication(
      application as typeof application & { studentId: string; internshipId: string },
      "system_auto_enrollment"
    );

    // 2. Generate and store personalized Offer Letter PDF automatically
    let offerIssued = false;
    try {
      await autoIssueOfferLetterForApplication(application.$id);
      offerIssued = true;
    } catch (offerError) {
      console.error("[enrollment] Auto offer letter generation failed:", offerError);
      await service.tablesDB.updateRow({
        databaseId: service.databaseId,
        tableId: applicationsTable,
        rowId: application.$id,
        data: { offerStatus: "failed" },
      }).catch(() => undefined);
    }

    return NextResponse.json({
      applicationId: application.$id,
      enrollmentId: enrollmentResult.row.$id,
      offerIssued,
      redirectTo: `/account/internships/${enrollmentResult.row.$id}?enrolled=1`,
    }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === 409) return NextResponse.json({ error: "You have already enrolled in this internship program." }, { status: 409 });
    console.error("[enrollment] Error in POST /api/applications:", error);
    return NextResponse.json({ error: "We could not complete your enrollment. Please try again." }, { status: 500 });
  }
}
