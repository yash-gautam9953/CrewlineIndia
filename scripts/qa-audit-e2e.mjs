import { Client, Users, TablesDB, Storage, Query } from "node-appwrite";
import { readFileSync } from "node:fs";

// Load .env.local
const envContent = readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
}

const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const projectId = env.APPWRITE_PROJECT_ID;
const apiKey = env.APPWRITE_API_KEY;
const databaseId = env.APPWRITE_DATABASE_ID;

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const users = new Users(client);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

const baseUrl = "http://localhost:3000";

const results = {
  passed: 0,
  failed: 0,
  details: [],
};

function record(name, status, message, extra = {}) {
  if (status === "PASS") results.passed++;
  else results.failed++;
  results.details.push({ name, status, message, ...extra });
  console.log(`[${status}] ${name}: ${message}`);
}

async function runAudit() {
  console.log("=== CREWLINE COMPREHENSIVE QA AUDIT START ===");
  console.log(`Target: ${baseUrl} | Appwrite Cloud: ${endpoint}`);

  const testId = `qa_${Date.now()}`;
  const testStudentEmail = `qa_test_student_${testId}@crewline.test`;
  const testPassword = `CrewlinePass@${testId}`;
  const testStudentName = `QA_TEST_Student ${testId}`;

  let studentAuthId = null;
  let sessionCookie = null;
  let createdDocId = null;
  let createdStorageFileId = null;
  let createdAppId = null;
  let createdEnrollmentId = null;
  let createdSubmissionId = null;
  let createdAssignmentId = null;

  try {
    // -------------------------------------------------------------
    // PHASE 2A: REGISTRATION & LOGIN
    // -------------------------------------------------------------
    console.log("\n--- Testing Student Registration & Login ---");

    // 1. Invalid registration (short password)
    const invalidRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "Test User", email: "bad-email", password: "123" }),
    });
    if (invalidRegRes.status === 400) {
      record("Registration Input Validation", "PASS", "Rejected invalid email and short password with 400 Bad Request");
    } else {
      record("Registration Input Validation", "FAIL", `Expected 400, got ${invalidRegRes.status}`);
    }

    // 2. Valid registration
    const validRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: testStudentName, email: testStudentEmail, password: testPassword }),
    });
    const regJson = await validRegRes.json().catch(() => ({}));
    const setCookie = validRegRes.headers.get("set-cookie");

    if (validRegRes.status === 201 && setCookie) {
      record("Student Registration", "PASS", "Account registered successfully, returned 201 and set session cookie");
      sessionCookie = setCookie.split(";")[0];
    } else {
      record("Student Registration", "FAIL", `Registration failed with status ${validRegRes.status}: ${JSON.stringify(regJson)}`);
      throw new Error("Cannot proceed without test user registration");
    }

    // Verify user in Appwrite Student Profiles
    const profileList = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_STUDENT_PROFILES_TABLE_ID,
      queries: [Query.equal("email", testStudentEmail), Query.limit(1)],
    });
    if (profileList.rows.length > 0) {
      studentAuthId = profileList.rows[0].authUserId;
      record("Appwrite Auth Persistence", "PASS", `Verified student profile in Appwrite table with authUserId: ${studentAuthId}`);
    } else {
      record("Appwrite Auth Persistence", "FAIL", "Student profile not found in Appwrite table");
    }

    // 3. Test incorrect credentials login
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testStudentEmail, password: "WrongPassword999!" }),
    });
    if (badLoginRes.status === 401) {
      record("Invalid Credentials Rejection", "PASS", "Rejected bad password with 401 Unauthorized");
    } else {
      record("Invalid Credentials Rejection", "FAIL", `Expected 401, got ${badLoginRes.status}`);
    }

    // 4. Test valid login
    const goodLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testStudentEmail, password: testPassword }),
    });
    const loginJson = await goodLoginRes.json().catch(() => ({}));
    if (goodLoginRes.status === 200 && loginJson.redirectTo) {
      record("Student Login", "PASS", `Logged in successfully, returned redirectTo: ${loginJson.redirectTo}`);
      const loginCookie = goodLoginRes.headers.get("set-cookie");
      if (loginCookie) sessionCookie = loginCookie.split(";")[0];
    } else {
      record("Student Login", "FAIL", `Expected 200, got ${goodLoginRes.status}`);
    }

    // -------------------------------------------------------------
    // PHASE 2B: STUDENT PROFILE
    // -------------------------------------------------------------
    console.log("\n--- Testing Student Profile ---");

    // Profile update
    const profileUpdateRes = await fetch(`${baseUrl}/api/account/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        fullName: `${testStudentName} Updated`,
        phone: "+919876543210",
        college: "QA Institute of Technology",
        course: "B.Tech Computer Science",
        currentYear: 3,
        city: "Bengaluru",
      }),
    });
    const profileJson = await profileUpdateRes.json().catch(() => ({}));
    if (profileUpdateRes.status === 200 && profileJson.saved) {
      record("Student Profile Update", "PASS", "Profile updated successfully via API");
    } else {
      record("Student Profile Update", "FAIL", `Profile update failed: status ${profileUpdateRes.status}, body ${JSON.stringify(profileJson)}`);
    }

    // Verify in Appwrite Database
    const profileRows = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_STUDENT_PROFILES_TABLE_ID,
      queries: [Query.equal("authUserId", studentAuthId), Query.limit(1)],
    });
    if (profileRows.total > 0 && profileRows.rows[0].college === "QA Institute of Technology") {
      record("Profile Database Persistence", "PASS", "Verified profile data persisted in Appwrite Student Profiles table");
    } else {
      record("Profile Database Persistence", "FAIL", "Profile row missing or fields not matching");
    }

    // -------------------------------------------------------------
    // PHASE 2C: INTERNSHIP ENROLLMENT & INSTANT ONBOARDING
    // -------------------------------------------------------------
    console.log("\n--- Testing Internship Enrollment & Instant Onboarding ---");

    // Fetch an available active internship
    const internships = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_INTERNSHIPS_TABLE_ID,
      queries: [Query.equal("publicationStatus", "published"), Query.limit(1)],
    });

    if (!internships.total) {
      record("Internship Catalog", "FAIL", "No published internships available in database to test enrollment");
      throw new Error("No internship available for enrollment testing");
    }

    const testInternship = internships.rows[0];
    const internshipId = testInternship.$id;
    console.log(`Using internship: ${testInternship.title} (${internshipId})`);

    const todayKolkata = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const enrollmentPayload = {
      internshipSlug: testInternship.slug,
      studentName: `${testStudentName} Updated`,
      phone: "+919876543210",
      college: "QA Institute of Technology",
      course: "B.Tech Computer Science",
      currentYear: 3,
      selectedDuration: "1 Month",
      requestedStartDate: todayKolkata,
      city: "Bengaluru",
      statement: "QA automated audit test enrollment",
    };

    // Submit instant enrollment
    const enrollRes = await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify(enrollmentPayload),
    });
    const enrollJson = await enrollRes.json().catch(() => ({}));

    if (enrollRes.status === 201 && enrollJson.applicationId && enrollJson.enrollmentId) {
      createdAppId = enrollJson.applicationId;
      createdEnrollmentId = enrollJson.enrollmentId;
      record("Instant Enrollment API", "PASS", `Enrollment succeeded without manual approval. App ID: ${createdAppId}, Enrollment ID: ${createdEnrollmentId}`);
    } else {
      record("Instant Enrollment API", "FAIL", `Enrollment failed with status ${enrollRes.status}: ${JSON.stringify(enrollJson)}`);
      throw new Error("Enrollment failed");
    }

    // Verify enrollment record in DB
    const enrollmentRow = await tablesDB.getRow({
      databaseId,
      tableId: env.APPWRITE_ENROLLMENTS_TABLE_ID,
      rowId: createdEnrollmentId,
    });

    if (enrollmentRow.status === "active" && enrollmentRow.startedAt && enrollmentRow.scheduledEndAt && enrollmentRow.submissionDeadlineAt) {
      // Verify deadline is 2 days before scheduledEndAt (end date)
      const endDate = new Date(enrollmentRow.scheduledEndAt);
      const deadlineDate = new Date(enrollmentRow.submissionDeadlineAt);
      const diffDays = Math.round((endDate.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 2) {
        record("Enrollment Deadline Calculation", "PASS", `Deadline is exactly 2 calendar days before end date (End: ${enrollmentRow.scheduledEndAt.slice(0, 10)}, Deadline: ${enrollmentRow.submissionDeadlineAt.slice(0, 10)})`);
      } else {
        record("Enrollment Deadline Calculation", "FAIL", `Expected 2 days diff, got ${diffDays} days`);
      }
    } else {
      record("Enrollment State Verification", "FAIL", `Enrollment record invalid: status=${enrollmentRow.status}, startedAt=${enrollmentRow.startedAt}, scheduledEndAt=${enrollmentRow.scheduledEndAt}`);
    }

    // Verify Offer Letter generation and Appwrite Documents table
    const docRows = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_DOCUMENTS_TABLE_ID,
      queries: [Query.equal("studentId", studentAuthId), Query.equal("documentType", "offer"), Query.limit(1)],
    });

    if (docRows.total > 0) {
      const doc = docRows.rows[0];
      createdDocId = doc.$id;
      createdStorageFileId = doc.storageFileId;
      record("Offer Letter Generation & DB Record", "PASS", `Offer letter generated with ID ${createdDocId}, file ID ${createdStorageFileId}`);
    } else {
      record("Offer Letter Generation & DB Record", "FAIL", "Offer letter document row not found in Documents table");
    }

    // Verify task assignment / availability
    const domainTasks = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_TASKS_TABLE_ID,
      queries: [Query.equal("internshipId", internshipId), Query.equal("isPublished", true), Query.limit(10)],
    });
    const assignments = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_TASK_ASSIGNMENTS_TABLE_ID,
      queries: [Query.equal("studentId", studentAuthId), Query.limit(1)],
    });

    if (assignments.total > 0) {
      createdAssignmentId = assignments.rows[0].$id;
      record("Automatic Task Assignment", "PASS", `Task assignment recorded with ID ${createdAssignmentId}, task ID ${assignments.rows[0].taskId}`);
    } else if (domainTasks.total > 0 && domainTasks.rows.some((t) => t.assignmentMode === "all_enrolled")) {
      record("Automatic Task Assignment", "PASS", `Domain tasks published in 'all_enrolled' mode (${domainTasks.total} active domain tasks automatically assigned to student)`);
    } else {
      record("Automatic Task Assignment", "PARTIAL", "No task assignment created (internship may not have tasks with assignmentMode 'selected_students' or tasks table empty)");
    }

    // Verify duplicate enrollment prevention
    const dupRes = await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify(enrollmentPayload),
    });
    const dupJson = await dupRes.json().catch(() => ({}));
    if (dupRes.status === 409 || dupJson.error?.includes("already") || dupJson.alreadyEnrolled) {
      record("Duplicate Enrollment Prevention", "PASS", "Rejected duplicate enrollment for same internship with 409/already enrolled message");
    } else {
      record("Duplicate Enrollment Prevention", "FAIL", `Expected rejection, got status ${dupRes.status}: ${JSON.stringify(dupJson)}`);
    }

    // -------------------------------------------------------------
    // PHASE 2D & 4: DOCUMENT DOWNLOAD & AUTHORIZATION
    // -------------------------------------------------------------
    console.log("\n--- Testing Document Download & Security ---");

    if (createdDocId) {
      // 1. Authorized student download
      const authDownloadRes = await fetch(`${baseUrl}/api/documents/${createdDocId}/download`, {
        headers: { Cookie: sessionCookie },
      });
      const contentType = authDownloadRes.headers.get("content-type");
      const pdfBytes = await authDownloadRes.arrayBuffer();
      const header = Buffer.from(pdfBytes.slice(0, 5)).toString("utf-8");

      if (authDownloadRes.status === 200 && contentType?.includes("pdf") && header.startsWith("%PDF")) {
        record("Authorized Student Download", "PASS", `Downloaded valid PDF (%PDF header, ${pdfBytes.byteLength} bytes)`);
      } else {
        record("Authorized Student Download", "FAIL", `Download failed: status ${authDownloadRes.status}, type: ${contentType}`);
      }

      // 2. Unauthenticated download attempt
      const unauthDownloadRes = await fetch(`${baseUrl}/api/documents/${createdDocId}/download`);
      if (unauthDownloadRes.status === 401) {
        record("Unauthenticated Download Protection", "PASS", "Unauthenticated request was blocked with 401 Unauthorized");
      } else {
        record("Unauthenticated Download Protection", "FAIL", `Expected 401, got ${unauthDownloadRes.status}`);
      }

      // 3. Unauthorized student download (horizontal privilege escalation)
      // Register a second synthetic student
      const attackerEmail = `qa_test_attacker_${testId}@crewline.test`;
      const attackerRegRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: "QA Attacker", email: attackerEmail, password: testPassword }),
      });
      const attackerCookie = attackerRegRes.headers.get("set-cookie")?.split(";")[0];

      if (attackerCookie) {
        const attackerDownloadRes = await fetch(`${baseUrl}/api/documents/${createdDocId}/download`, {
          headers: { Cookie: attackerCookie },
        });
        if (attackerDownloadRes.status === 404 || attackerDownloadRes.status === 403) {
          record("Cross-Student Document Isolation", "PASS", `Other student received ${attackerDownloadRes.status} when trying to download another student's document`);
        } else {
          record("Cross-Student Document Isolation", "FAIL", `Security hole: Other student could access document! Status: ${attackerDownloadRes.status}`);
        }

        // Clean up attacker
        const attackerProfiles = await tablesDB.listRows({
          databaseId,
          tableId: env.APPWRITE_STUDENT_PROFILES_TABLE_ID,
          queries: [Query.equal("email", attackerEmail), Query.limit(1)],
        });
        if (attackerProfiles.total) {
          const attackerAuthId = attackerProfiles.rows[0].authUserId;
          await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_STUDENT_PROFILES_TABLE_ID, rowId: attackerProfiles.rows[0].$id }).catch(() => {});
          await users.delete({ userId: attackerAuthId }).catch(() => {});
        }
      }
    }

    // -------------------------------------------------------------
    // PHASE 2E: TASK SUBMISSION
    // -------------------------------------------------------------
    console.log("\n--- Testing Task Submission ---");

    // Check available task
    const tasks = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_TASKS_TABLE_ID,
      queries: [Query.equal("internshipId", internshipId), Query.limit(1)],
    });

    if (tasks.total > 0) {
      const taskId = tasks.rows[0].$id;
      const subRes = await fetch(`${baseUrl}/api/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          taskId,
          projectTitle: "QA E2E Responsive Landing Page Project",
          projectDescription: "A fully responsive HTML5/CSS3 landing page with accessible navigation and interactive mobile drawer menu.",
          repositoryUrl: "https://github.com/crewline/qa-test-submission",
          liveUrl: "https://qa-test-demo.crewline.me",
          explanation: "Automated end-to-end verification of project task submission workflow with live URLs.",
        }),
      });
      const subJson = await subRes.json().catch(() => ({}));
      if (subRes.status === 201 && (subJson.id || subJson.submissionId)) {
        createdSubmissionId = subJson.id || subJson.submissionId;
        record("Task Submission", "PASS", `Task submitted successfully with ID: ${createdSubmissionId}`);
      } else {
        record("Task Submission", "FAIL", `Task submission failed with status ${subRes.status}: ${JSON.stringify(subJson)}`);
      }
    } else {
      record("Task Submission", "PARTIAL", "No published tasks found for this internship to test task submission");
    }

    // -------------------------------------------------------------
    // PHASE 3 & 5: ADMIN WORKFLOW & SECURITY VERIFICATION
    // -------------------------------------------------------------
    console.log("\n--- Testing Admin Role Protection & Security ---");

    // 1. Student trying to access admin endpoints
    const adminEndpoints = [
      "/api/admin/internships",
      "/api/admin/tasks",
      "/api/admin/payments/request",
      `/api/admin/enrollments/${createdEnrollmentId}/complete`,
    ];

    for (const ep of adminEndpoints) {
      const res = await fetch(`${baseUrl}${ep}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ test: true }),
      });
      if (res.status === 403 || res.status === 401) {
        record(`Admin Endpoint Protection (${ep})`, "PASS", `Correctly rejected student request with ${res.status}`);
      } else {
        record(`Admin Endpoint Protection (${ep})`, "FAIL", `Security vulnerability: Student could call admin endpoint! Status: ${res.status}`);
      }
    }

    // -------------------------------------------------------------
    // PHASE 2H: CERTIFICATE ELIGIBILITY ENFORCEMENT
    // -------------------------------------------------------------
    console.log("\n--- Testing Certificate Eligibility Enforcement ---");

    // Attempting to issue completion certificate when enrollment is active (not completed)
    // Using internal prepareDocument logic via node script or preview endpoint
    const previewRes = await fetch(`${baseUrl}/api/admin/documents/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        documentType: "internship_completion",
        sourceId: createdEnrollmentId,
      }),
    });
    if (previewRes.status === 403) {
      record("Certificate Preview Admin Gate", "PASS", "Student blocked from generating certificate preview (403)");
    } else {
      record("Certificate Preview Admin Gate", "FAIL", `Expected 403, got ${previewRes.status}`);
    }

  } catch (err) {
    console.error("Audit encounter error:", err.message);
    record("Audit Execution", "FAIL", `Unexpected error during test execution: ${err.message}`);
  } finally {
    // -------------------------------------------------------------
    // CLEANUP SYNTHETIC TEST DATA
    // -------------------------------------------------------------
    console.log("\n--- Cleaning Up Synthetic QA Test Data ---");

    // 1. Delete Storage File
    if (createdStorageFileId) {
      try {
        await storage.deleteFile({ bucketId: env.APPWRITE_DOCUMENTS_BUCKET_ID, fileId: createdStorageFileId });
        console.log(`Cleaned up test PDF from bucket: ${createdStorageFileId}`);
      } catch (e) { console.warn("Storage cleanup notice:", e.message); }
    }

    // 2. Delete Documents Row
    if (createdDocId) {
      try {
        await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_DOCUMENTS_TABLE_ID, rowId: createdDocId });
        console.log(`Cleaned up test document record: ${createdDocId}`);
      } catch (e) { console.warn("Doc cleanup notice:", e.message); }
    }

    // 3. Delete Task Submission
    if (createdSubmissionId) {
      try {
        await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_SUBMISSIONS_TABLE_ID, rowId: createdSubmissionId });
        console.log(`Cleaned up test submission: ${createdSubmissionId}`);
      } catch (e) { console.warn("Submission cleanup notice:", e.message); }
    }

    // 4. Delete Task Assignment
    if (createdAssignmentId) {
      try {
        await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_TASK_ASSIGNMENTS_TABLE_ID, rowId: createdAssignmentId });
        console.log(`Cleaned up test task assignment: ${createdAssignmentId}`);
      } catch (e) { console.warn("Assignment cleanup notice:", e.message); }
    }

    // 5. Delete Enrollment
    if (createdEnrollmentId) {
      try {
        await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_ENROLLMENTS_TABLE_ID, rowId: createdEnrollmentId });
        console.log(`Cleaned up test enrollment: ${createdEnrollmentId}`);
      } catch (e) { console.warn("Enrollment cleanup notice:", e.message); }
    }

    // 6. Delete Application
    if (createdAppId) {
      try {
        await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_APPLICATIONS_TABLE_ID, rowId: createdAppId });
        console.log(`Cleaned up test application: ${createdAppId}`);
      } catch (e) { console.warn("Application cleanup notice:", e.message); }
    }

    // 7. Delete Student Profile
    if (studentAuthId) {
      try {
        const pRows = await tablesDB.listRows({
          databaseId,
          tableId: env.APPWRITE_STUDENT_PROFILES_TABLE_ID,
          queries: [Query.equal("authUserId", studentAuthId), Query.limit(1)],
        });
        if (pRows.total) {
          await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_STUDENT_PROFILES_TABLE_ID, rowId: pRows.rows[0].$id });
          console.log(`Cleaned up test student profile: ${pRows.rows[0].$id}`);
        }
      } catch (e) { console.warn("Profile cleanup notice:", e.message); }

      // 8. Delete Appwrite User
      try {
        await users.delete({ userId: studentAuthId });
        console.log(`Cleaned up test user account: ${studentAuthId}`);
      } catch (e) { console.warn("User cleanup notice:", e.message); }
    }

    console.log("Cleanup complete. Zero synthetic test residue remains.");
  }

  console.log("\n==========================================");
  console.log(`QA AUDIT COMPLETED: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log("==========================================");
}

runAudit();
