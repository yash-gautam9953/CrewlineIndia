import { readFileSync } from "node:fs";
import { Client, ID, Query, Storage, TablesDB } from "node-appwrite";
import { calculateInternshipDates } from "../src/lib/internship-dates.js";
import { ensureEnrollmentForApprovedApplication } from "../src/lib/enrollments.js";
import { autoIssueOfferLetterForApplication } from "../src/lib/documents/document-service.js";

function readEnv() {
  const source = readFileSync(".env.local", "utf8");
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

const env = readEnv();
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}
const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const db = new TablesDB(client);
const storage = new Storage(client);

async function main() {
  console.log("=== CREWLINE LIVE ENROLLMENT PIPELINE TEST ===");

  // 1. Fetch a published internship
  const internships = await db.listRows({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: env.APPWRITE_INTERNSHIPS_TABLE_ID,
    queries: [Query.equal("publicationStatus", "published"), Query.limit(1)],
  });
  if (!internships.rows[0]) throw new Error("No published internships found in database.");
  const internship = internships.rows[0];
  console.log(`[1] Selected Published Internship: ${internship.title} (${internship.domain}), ID: ${internship.$id}`);

  // 2. Create or find test student profile
  const testUserId = `test-student-${Date.now()}`;
  const testStudentName = "Aarav Test Student";
  const testEmail = `${testUserId}@example.com`;

  const profile = await db.createRow({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: env.APPWRITE_STUDENT_PROFILES_TABLE_ID,
    rowId: ID.unique(),
    data: {
      authUserId: testUserId,
      fullName: testStudentName,
      email: testEmail,
      phone: "+91 9876543210",
      college: "Indian Institute of Technology",
      course: "Computer Science and Engineering",
      currentYear: 3,
      city: "Bengaluru",
      avatarFileId: null,
      profileStatus: "active",
    },
  });
  console.log(`[2] Created Student Profile: ${profile.$id} for user ${testUserId}`);

  // 3. Create active task for this domain to verify automatic task assignment
  const testTask = await db.createRow({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: env.APPWRITE_TASKS_TABLE_ID,
    rowId: ID.unique(),
    data: {
      internshipId: internship.$id,
      title: "Build Responsive Landing Page & User Form",
      instructions: "Implement a responsive web interface according to the provided deliverables. Submit GitHub repo and live deployment URL.",
      sequence: 1,
      isMandatory: true,
      dueAt: null,
      maxScore: 100,
      isPublished: true,
      assignmentMode: "all_enrolled",
      resourceFileId: null,
      resourceFileName: null,
      resourceVersion: 1,
    },
  });
  console.log(`[3] Seeded Domain Task: ${testTask.$id} (${testTask.title})`);

  // 4. Calculate internship dates
  const dates = calculateInternshipDates("2026-11-20", "1 Month");
  console.log(`[4] Calculated Dates: Start=${dates.startAt}, End=${dates.endAt}, Deadline=${dates.submissionDeadlineAt}`);

  // 5. Create instant application (pre-approved)
  const application = await db.createRow({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: env.APPWRITE_APPLICATIONS_TABLE_ID,
    rowId: ID.unique(),
    data: {
      studentId: testUserId,
      internshipId: internship.$id,
      domain: internship.domain,
      studentName: testStudentName,
      studentEmail: testEmail,
      phone: "+91 9876543210",
      college: "Indian Institute of Technology",
      course: "Computer Science and Engineering",
      currentYear: 3,
      city: "Bengaluru",
      statement: "Enrolling for virtual internship program.",
      selectedDuration: "1 Month",
      requestedStartDate: dates.startAt,
      proposedEndDate: dates.endAt,
      status: "approved",
      offerStatus: "draft",
      offerStartDate: dates.startAt,
      offerDuration: "1 Month",
      offerMode: "remote",
      reviewedBy: "system_auto_enrollment",
      reviewedAt: new Date().toISOString(),
      reviewNote: "Automatic enrollment on student registration",
    },
  });
  console.log(`[5] Created Instant Application: ${application.$id} with status: ${application.status}`);

  // 6. Ensure active enrollment & task assignment
  const enrollmentResult = await ensureEnrollmentForApprovedApplication(application, "system_auto_enrollment");
  console.log(`[6] Created Active Enrollment: ${enrollmentResult.row.$id}, Status: ${enrollmentResult.row.status}`);
  console.log(`    Task Assignment: ${enrollmentResult.taskAssigned ? "Assigned published task" : "No task"}`);

  // 7. Auto-generate Offer Letter PDF
  console.log(`[7] Generating and storing official Offer Letter...`);
  const offerResult = await autoIssueOfferLetterForApplication(application.$id, testUserId);
  console.log(`[8] Stored Offer Letter Document: ${offerResult.row.$id}, Status: ${offerResult.row.status}, FileId: ${offerResult.row.storageFileId}`);

  // 8. Verify the PDF in Appwrite Storage
  const fileBytes = await storage.getFileDownload({
    bucketId: env.APPWRITE_DOCUMENTS_BUCKET_ID,
    fileId: offerResult.row.storageFileId,
  });
  console.log(`[9] Successfully downloaded generated PDF from Appwrite Storage (${fileBytes.byteLength} bytes)`);

  // 9. Verify Idempotency - calling again must NOT create duplicate document
  const retryResult = await autoIssueOfferLetterForApplication(application.$id, testUserId);
  console.log(`[10] Idempotency Check: alreadyIssued=${retryResult.alreadyIssued}, DocumentId=${retryResult.row.$id}`);
  if (!retryResult.alreadyIssued) throw new Error("Idempotency check failed: duplicate offer generated!");

  console.log("\n✓ ALL END-TO-END PIPELINE CHECKS PASSED!");
}

main().catch((err) => {
  console.error("Test pipeline failed:", err);
  process.exit(1);
});
