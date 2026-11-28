import { after, NextResponse } from "next/server";
import { ID, Permission, Query, Role } from "node-appwrite";
import { z } from "zod";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { AppwriteResourceError, getAppwriteResources } from "@/lib/appwrite/resources";
import { ensureStudentProfile } from "@/lib/student-profile";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security";
import { checkRequiredEnv, ENROLLMENT_REQUIRED_ENV } from "@/lib/env";
import { calculateInternshipDates, INTERNSHIP_DURATIONS } from "@/lib/internship-dates";
import { ensureEnrollmentForApprovedApplication } from "@/lib/enrollments";
import { autoIssueOfferLetterForApplication, writeAuditLog } from "@/lib/documents/document-service";
import { enrollmentConfirmationEmail, sendCrewlineEmail } from "@/lib/email";

const schema = z.object({
  internshipSlug: z.string().trim().min(1).max(180),
  studentName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(32),
  college: z.string().trim().min(2).max(180),
  course: z.string().trim().min(2).max(160),
  currentYear: z.coerce.number().int().min(1).max(8),
  selectedDuration: z.enum(INTERNSHIP_DURATIONS).optional().default("1 Month"),
  requestedStartDate: z.iso.date().optional(),
  city: z.string().trim().min(2).max(120),
  statement: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
    }
    const rl = await checkRateLimit(request, "application-submit", 5);
    if (rl.limited) {
      return NextResponse.json(
        {
          error: rl.unavailable
            ? "Enrollment rate protection is temporarily unavailable. Check server configuration."
            : "Too many enrollments were submitted. Please wait a minute and try again.",
        },
        { status: rl.unavailable ? 503 : 429 }
      );
    }

    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please sign in to enroll." }, { status: 401 });

    const envCheck = checkRequiredEnv(ENROLLMENT_REQUIRED_ENV);
    const service = createPrivilegedAppwriteClient();
    if (!envCheck.ok || !service) {
      console.error("[enrollment] Missing required environment configuration:", envCheck.missing, envCheck.mismatchError);
      return NextResponse.json({ error: "Enrollment service is not configured." }, { status: 503 });
    }
    let resources;
    try {
      resources = await getAppwriteResources();
    } catch (error) {
      if (error instanceof AppwriteResourceError) {
        console.error("[enrollment] Appwrite resource resolution failed:", error.message);
      }
      return NextResponse.json({ error: "Enrollment service is not configured." }, { status: 503 });
    }
    const {
      internships: internshipsTable,
      applications: applicationsTable,
      enrollments: enrollmentsTable,
      studentProfiles: profilesTable,
    } = resources.tables;

    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return NextResponse.json({ error: "Please complete all required enrollment details." }, { status: 400 });
    }

    // Confirmed business rule: internship starts immediately on enrollment date (Asia/Kolkata)
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    if (input.data.requestedStartDate && input.data.requestedStartDate !== today) {
      return NextResponse.json(
        { error: "Internship start date is automatically set to today's enrollment date and cannot be changed." },
        { status: 400 }
      );
    }

    const duration = "1 Month" as const;
    const dates = calculateInternshipDates(today, duration);

    // Fetch internship program + student profile concurrently
    const [internships, profile] = await Promise.all([
      service.tablesDB.listRows({
        databaseId: service.databaseId,
        tableId: internshipsTable,
        queries: [Query.equal("slug", input.data.internshipSlug), Query.equal("publicationStatus", "published"), Query.limit(1)],
      }),
      ensureStudentProfile(session.user),
    ]);
    const internship = internships.rows[0];
    if (!internship) {
      return NextResponse.json({ error: "This internship domain is not currently available for enrollment." }, { status: 404 });
    }

    const [duplicateApps, duplicateEnrollments] = await Promise.all([
      service.tablesDB.listRows({
        databaseId: service.databaseId,
        tableId: applicationsTable,
        queries: [Query.equal("studentId", session.user.$id), Query.equal("internshipId", internship.$id), Query.limit(1)],
      }),
      service.tablesDB.listRows({
        databaseId: service.databaseId,
        tableId: enrollmentsTable,
        queries: [Query.equal("studentId", session.user.$id), Query.equal("internshipId", internship.$id), Query.limit(1)],
      }),
    ]);
    if (duplicateApps.rows.length || duplicateEnrollments.rows.length) {
      return NextResponse.json({ error: "You have already enrolled in this internship program." }, { status: 409 });
    }

    await service.tablesDB.updateRow({
      databaseId: service.databaseId,
      tableId: profilesTable,
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
        selectedDuration: duration,
        requestedStartDate: dates.startAt,
        proposedEndDate: dates.endAt,
        status: "approved",
        offerStatus: "draft",
        offerStartDate: dates.startAt,
        offerDuration: duration,
        offerMode: "remote",
        reviewedBy: "system_auto_enrollment",
        reviewedAt: now,
        reviewNote: "Automatic enrollment on student registration",
      },
      permissions: [Permission.read(Role.user(session.user.$id))],
    });

    // Atomic compensation: if enrollment creation fails, remove the orphaned application row
    let enrollmentResult;
    try {
      enrollmentResult = await ensureEnrollmentForApprovedApplication(
        application as typeof application & { studentId: string; internshipId: string },
        "system_auto_enrollment"
      );
    } catch (enrollmentError) {
      await service.tablesDB
        .deleteRow({ databaseId: service.databaseId, tableId: applicationsTable, rowId: application.$id })
        .catch(() => undefined);
      await writeAuditLog(
        service,
        session.user.$id,
        "enrollment.failed",
        application.$id,
        {
          internshipId: internship.$id,
          reason: enrollmentError instanceof Error ? enrollmentError.message : "Enrollment creation failed",
        },
        "enrollment"
      );
      throw enrollmentError;
    }

    // Generate and store personalized Offer Letter PDF
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
      await writeAuditLog(
        service,
        session.user.$id,
        "offer.auto_issue_failed",
        application.$id,
        {
          enrollmentId: enrollmentResult.row.$id,
          reason: offerError instanceof Error ? offerError.message : "Offer letter generation failed",
        },
        "document"
      );
    }

    after(async () => {
      await sendCrewlineEmail({
        userId: session.user.$id,
        subject: `Crewline enrollment active: ${String(internship.title ?? "Internship")}`,
        html: enrollmentConfirmationEmail({
          studentName: input.data.studentName,
          internshipTitle: String(internship.title ?? "Internship"),
          startDate: dates.startAt.slice(0, 10),
          endDate: dates.endAt.slice(0, 10),
          deadlineDate: dates.submissionDeadlineAt.slice(0, 10),
          offerIssued,
        }),
      }).catch((err) => console.error("[enrollment] Async email error:", err));
    });

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
