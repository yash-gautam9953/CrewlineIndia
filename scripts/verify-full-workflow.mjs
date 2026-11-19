import { Client, Users, Account, TablesDB, Storage, Query } from "node-appwrite";
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

let passed = 0;
let failed = 0;

function logResult(step, ok, msg) {
  if (ok) {
    passed++;
    console.log(`[PASS] ${step}: ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${step}: ${msg}`);
  }
}

async function run() {
  console.log("=== CREWLINE FULL INTERNSHIP WORKFLOW VERIFICATION ===");
  console.log(`Base URL: ${baseUrl} | Appwrite Endpoint: ${endpoint}`);

  const testSuffix = Date.now().toString().slice(-6);
  const studentEmail = `workflow_test_${testSuffix}@crewline.test`;
  const studentPassword = `WorkflowPass!${testSuffix}`;
  const studentName = `Workflow Student ${testSuffix}`;

  let studentAuthId = null;
  let sessionCookie = null;
  let enrollmentId = null;
  let applicationId = null;
  let submissionId = null;
  let internshipId = null;
  let internshipCertId = null;
  let projectCertId = null;
  let adminSession = null;
  const adminUserId = env.CREWLINE_ADMIN_IDENTITIES?.split(",")[0]?.trim() || "6afcb1c10016bc3b8c11";

  try {
    // Step 1: Register Student
    console.log("\n--- Step 1: Registering Synthetic Student ---");
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: studentName,
        email: studentEmail,
        password: studentPassword,
      }),
    });
    logResult("Register Student", regRes.status === 201, `Status ${regRes.status}`);

    const regSetCookie = regRes.headers.get("set-cookie");
    sessionCookie = regSetCookie ? regSetCookie.split(";")[0] : "";

    if (!sessionCookie) {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: studentEmail,
          password: studentPassword,
        }),
      });
      const loginSetCookie = loginRes.headers.get("set-cookie");
      sessionCookie = loginSetCookie ? loginSetCookie.split(";")[0] : "";
    }

    const match = sessionCookie ? sessionCookie.match(/a_session_[^=]+=([^;]+)/) : null;
    const sessionSecret = match ? match[1] : null;
    if (sessionSecret) {
      const studentClient = new Client().setEndpoint(endpoint).setProject(projectId).setSession(sessionSecret);
      const studentAccount = new Account(studentClient);
      const studentUser = await studentAccount.get();
      studentAuthId = studentUser.$id;
    }
    logResult("Student Session Acquired", Boolean(studentAuthId && sessionCookie), `Auth ID: ${studentAuthId}`);

    // Step 2: Complete Student Profile
    console.log("\n--- Step 2: Updating Profile ---");
    const profileRes = await fetch(`${baseUrl}/api/account/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        fullName: studentName,
        phone: "+919876543210",
        college: "Delhi Technological University",
        course: "B.Tech Computer Science",
        currentYear: 3,
        city: "New Delhi",
      }),
    });
    logResult("Profile Update", profileRes.status === 200, `Status ${profileRes.status}`);

    // Step 3: Find Published Internship & Enroll
    console.log("\n--- Step 3: Student Internship Enrollment ---");
    const published = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_INTERNSHIPS_TABLE_ID,
      queries: [Query.equal("publicationStatus", "published"), Query.limit(1)],
    });
    if (!published.rows.length) {
      throw new Error("No published internship available for testing.");
    }
    const internship = published.rows[0];
    internshipId = internship.$id;

    const todayDate = new Date().toISOString().slice(0, 10);
    const enrollRes = await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        internshipSlug: internship.slug,
        studentName,
        phone: "+919876543210",
        college: "Delhi Technological University",
        course: "B.Tech Computer Science",
        currentYear: 3,
        selectedDuration: "1 Month",
        requestedStartDate: todayDate,
        city: "New Delhi",
        statement: "Automated workflow test enrollment",
      }),
    });
    const enrollData = await enrollRes.json();
    logResult("Enrollment Created", enrollRes.status === 201, `Status ${enrollRes.status}, offerIssued: ${enrollData.offerIssued}`);
    enrollmentId = enrollData.enrollmentId;
    applicationId = enrollData.applicationId;

    // Check enrollment in Appwrite: must be status: "active", duration: 1 Month
    const enrollmentRow = await tablesDB.getRow({
      databaseId,
      tableId: env.APPWRITE_ENROLLMENTS_TABLE_ID,
      rowId: enrollmentId,
    });
    logResult(
      "Enrollment Status Immediately Active",
      enrollmentRow.status === "active",
      `Status: ${enrollmentRow.status}, Duration: ${enrollmentRow.selectedDuration}`
    );

    // Verify 1 calendar month calculation
    const startObj = new Date(enrollmentRow.startedAt);
    const endObj = new Date(enrollmentRow.scheduledEndAt);
    const expectedMonth = (startObj.getUTCMonth() + 1) % 12;
    logResult(
      "1 Calendar Month Calculation",
      endObj.getUTCMonth() === expectedMonth,
      `Start: ${enrollmentRow.startedAt.slice(0, 10)}, End: ${enrollmentRow.scheduledEndAt.slice(0, 10)}`
    );

    // Verify Offer Letter in Documents table
    const offerDocRows = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_DOCUMENTS_TABLE_ID,
      queries: [
        Query.equal("studentId", studentAuthId),
        Query.equal("documentType", "offer"),
        Query.limit(1),
      ],
    });
    logResult(
      "Offer Letter Generated in Documents",
      offerDocRows.rows.length === 1 && offerDocRows.rows[0].status === "valid",
      `Offer Letter ID: ${offerDocRows.rows[0]?.$id}`
    );

    // Step 4: Verify Dedicated Internship Details Page Loads
    console.log("\n--- Step 4: Student Internship Workspace & Task Check ---");
    const detailsRes = await fetch(`${baseUrl}/account/internships/${enrollmentId}`, {
      headers: { Cookie: sessionCookie },
    });
    logResult("Internship Details Page Loads", detailsRes.status === 200, `HTTP ${detailsRes.status}`);

    // Check assigned task for this internship
    const taskRows = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_TASKS_TABLE_ID,
      queries: [Query.equal("internshipId", internshipId), Query.equal("isPublished", true), Query.limit(1)],
    });
    if (!taskRows.rows.length) {
      throw new Error(`No published task found for internship ${internshipId}`);
    }
    const task = taskRows.rows[0];
    logResult("Assigned Domain Task Found", Boolean(task.$id), `Task ID: ${task.$id}, Title: "${task.title}"`);

    // Step 5: Student Submits Final Project
    console.log("\n--- Step 5: Student Project Submission ---");
    const subRes = await fetch(`${baseUrl}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        taskId: task.$id,
        projectTitle: "E-Commerce Cloud Architecture Workflow Project",
        projectDescription: "A full-stack, scalable application deployed with high availability and automated CI/CD pipelines.",
        repositoryUrl: "https://github.com/crewline/synthetic-workflow-test",
        liveUrl: "https://demo.crewline.test/project",
        explanation: "Implemented complete authentication, database models, and cloud storage integrations.",
      }),
    });
    const subData = await subRes.json();
    submissionId = subData.id || subData.submissionId;
    logResult("Project Submission", subRes.status === 201, `Status ${subRes.status}, Submission ID: ${submissionId}`);

    // Verify submission is linked to enrollment
    const subRow = await tablesDB.getRow({
      databaseId,
      tableId: env.APPWRITE_SUBMISSIONS_TABLE_ID,
      rowId: submissionId,
    });
    logResult(
      "Submission Linked to Enrollment",
      subRow.enrollmentId === enrollmentId && subRow.status === "submitted",
      `EnrollmentId: ${subRow.enrollmentId}, Status: ${subRow.status}`
    );

    // Step 6: Admin Authentication
    console.log("\n--- Step 6: Admin Authentication ---");
    adminSession = await users.createSession({ userId: adminUserId });
    const adminCookie = `a_session_${projectId}=${adminSession.secret}`;
    logResult("Admin Session Acquired", Boolean(adminSession.secret), `Admin User ID: ${adminUserId}`);

    // Step 7: Payment Verification Enforcement
    console.log("\n--- Step 7: Payment Verification & Gatekeeping ---");
    // Find payment record for this enrollment
    const paymentRows = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_PAYMENTS_TABLE_ID,
      queries: [
        Query.equal("studentId", studentAuthId),
        Query.equal("enrollmentId", enrollmentId),
        Query.limit(1),
      ],
    });
    let paymentRecord = paymentRows.rows[0];

    // If payment record is not verified (e.g. pending/submitted), approval must be BLOCKED
    if (paymentRecord) {
      // Simulate unverified payment status
      await tablesDB.updateRow({
        databaseId,
        tableId: env.APPWRITE_PAYMENTS_TABLE_ID,
        rowId: paymentRecord.$id,
        data: { status: "pending", amountDue: 500 },
      });

      // Try to approve with unverified payment => MUST FAIL with 400
      const blockedApproveRes = await fetch(`${baseUrl}/api/admin/submissions/${submissionId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({
          decision: "approved",
          feedback: "Attempting approval before payment verification",
          score: 95,
        }),
      });
      logResult(
        "Gatekeeping: Approval Blocked when Payment Unverified",
        blockedApproveRes.status === 400,
        `Status ${blockedApproveRes.status}`
      );

      // Now simulate student submitting transaction reference, then admin verifies payment
      await tablesDB.updateRow({
        databaseId,
        tableId: env.APPWRITE_PAYMENTS_TABLE_ID,
        rowId: paymentRecord.$id,
        data: { status: "submitted", transactionReference: "UPI-WORKFLOW-TEST-999" },
      });

      const verifyPayRes = await fetch(`${baseUrl}/api/admin/payments/${paymentRecord.$id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({
          status: "verified",
          reason: "Payment verified against bank reference",
        }),
      });
      logResult("Admin Manually Verifies Payment", verifyPayRes.status === 200, `Status ${verifyPayRes.status}`);
    }

    // Step 8: Final Admin Approval & Certificate Generation
    console.log("\n--- Step 8: Final Admin Approval & Certificate Generation ---");
    const approveRes = await fetch(`${baseUrl}/api/admin/submissions/${submissionId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        decision: "approved",
        feedback: "Exceptional architecture and comprehensive documentation. All requirements met.",
        score: 98,
      }),
    });
    const approveData = await approveRes.json();
    logResult(
      "Admin Approval Succeeded",
      approveRes.status === 200 && approveData.reviewed === true,
      `Certificates issued: ${approveData.certificatesIssued}`
    );

    // Verify submission is approved and enrollment is completed
    const updatedSub = await tablesDB.getRow({
      databaseId,
      tableId: env.APPWRITE_SUBMISSIONS_TABLE_ID,
      rowId: submissionId,
    });
    const updatedEnrollment = await tablesDB.getRow({
      databaseId,
      tableId: env.APPWRITE_ENROLLMENTS_TABLE_ID,
      rowId: enrollmentId,
    });
    logResult(
      "Submission Approved & Enrollment Completed",
      updatedSub.status === "approved" && updatedEnrollment.status === "completed" && Boolean(updatedEnrollment.completedAt),
      `Sub: ${updatedSub.status}, Enrollment: ${updatedEnrollment.status}, CompletedAt: ${updatedEnrollment.completedAt}`
    );

    // Step 9: Verify Both Certificates in Documents Table
    console.log("\n--- Step 9: Certificate Verification in Documents Table ---");
    const internCertRows = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_DOCUMENTS_TABLE_ID,
      queries: [
        Query.equal("studentId", studentAuthId),
        Query.equal("documentType", "internship_completion"),
        Query.limit(1),
      ],
    });
    logResult(
      "Internship Completion Certificate Exists",
      internCertRows.rows.length === 1 && internCertRows.rows[0].status === "valid",
      `ID: ${internCertRows.rows[0]?.$id}`
    );
    internshipCertId = internCertRows.rows[0]?.$id;

    const projCertRows = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_DOCUMENTS_TABLE_ID,
      queries: [
        Query.equal("studentId", studentAuthId),
        Query.equal("documentType", "project_completion"),
        Query.limit(1),
      ],
    });
    logResult(
      "Project Completion Certificate Exists",
      projCertRows.rows.length === 1 && projCertRows.rows[0].status === "valid",
      `ID: ${projCertRows.rows[0]?.$id}`
    );
    projectCertId = projCertRows.rows[0]?.$id;

    // Step 10: Verify Public QR Verification Endpoint
    console.log("\n--- Step 10: Public QR / ID Verification ---");
    if (internshipCertId) {
      const pubInternRes = await fetch(`${baseUrl}/verify/${internshipCertId}`);
      logResult(
        "Public Verification: Internship Certificate",
        pubInternRes.status === 200,
        `HTTP ${pubInternRes.status}`
      );
    }
    if (projectCertId) {
      const pubProjRes = await fetch(`${baseUrl}/verify/${projectCertId}`);
      logResult(
        "Public Verification: Project Certificate",
        pubProjRes.status === 200,
        `HTTP ${pubProjRes.status}`
      );
    }

    // Step 11: Idempotency Check — Re-submitting approval does NOT duplicate
    console.log("\n--- Step 11: Idempotency & Duplicate Prevention ---");
    const duplicateApproveRes = await fetch(`${baseUrl}/api/admin/submissions/${submissionId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        decision: "approved",
        feedback: "Duplicate approval attempt",
      }),
    });
    logResult(
      "Idempotency: Re-approval Attempt Safely Handled",
      duplicateApproveRes.status === 409,
      `HTTP ${duplicateApproveRes.status}`
    );

    // Verify exactly 1 of each document exists for student
    const allStudentDocs = await tablesDB.listRows({
      databaseId,
      tableId: env.APPWRITE_DOCUMENTS_TABLE_ID,
      queries: [Query.equal("studentId", studentAuthId), Query.limit(10)],
    });
    const offers = allStudentDocs.rows.filter((d) => d.documentType === "offer");
    const internCerts = allStudentDocs.rows.filter((d) => d.documentType === "internship_completion");
    const projCerts = allStudentDocs.rows.filter((d) => d.documentType === "project_completion");
    logResult(
      "Strict Single Document Per Type",
      offers.length === 1 && internCerts.length === 1 && projCerts.length === 1,
      `Offers: ${offers.length}, InternshipCerts: ${internCerts.length}, ProjectCerts: ${projCerts.length}`
    );
  } catch (err) {
    console.error("Workflow Verification Encountered Error:", err);
    failed++;
  } finally {
    // Clean up synthetic test records
    console.log("\n--- Cleanup Synthetic Records ---");
    try {
      if (studentAuthId) {
        // Delete documents created for this test student
        const studentDocs = await tablesDB.listRows({
          databaseId,
          tableId: env.APPWRITE_DOCUMENTS_TABLE_ID,
          queries: [Query.equal("studentId", studentAuthId), Query.limit(50)],
        });
        for (const doc of studentDocs.rows) {
          if (doc.storageFileId) {
            await storage.deleteFile({ bucketId: env.APPWRITE_DOCUMENTS_BUCKET_ID, fileId: doc.storageFileId }).catch(() => undefined);
          }
          await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_DOCUMENTS_TABLE_ID, rowId: doc.$id }).catch(() => undefined);
        }

        // Delete reviews
        if (submissionId) {
          const revs = await tablesDB.listRows({
            databaseId,
            tableId: env.APPWRITE_REVIEWS_TABLE_ID,
            queries: [Query.equal("submissionId", submissionId), Query.limit(10)],
          });
          for (const rev of revs.rows) {
            await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_REVIEWS_TABLE_ID, rowId: rev.$id }).catch(() => undefined);
          }
          await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_SUBMISSIONS_TABLE_ID, rowId: submissionId }).catch(() => undefined);
        }

        // Delete payments
        const pays = await tablesDB.listRows({
          databaseId,
          tableId: env.APPWRITE_PAYMENTS_TABLE_ID,
          queries: [Query.equal("studentId", studentAuthId), Query.limit(10)],
        });
        for (const pay of pays.rows) {
          await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_PAYMENTS_TABLE_ID, rowId: pay.$id }).catch(() => undefined);
        }

        // Delete enrollment
        if (enrollmentId) {
          await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_ENROLLMENTS_TABLE_ID, rowId: enrollmentId }).catch(() => undefined);
        }

        // Delete application
        if (applicationId) {
          await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_APPLICATIONS_TABLE_ID, rowId: applicationId }).catch(() => undefined);
        }

        // Delete student profile
        const profs = await tablesDB.listRows({
          databaseId,
          tableId: env.APPWRITE_STUDENT_PROFILES_TABLE_ID,
          queries: [Query.equal("authUserId", studentAuthId), Query.limit(1)],
        });
        if (profs.rows[0]) {
          await tablesDB.deleteRow({ databaseId, tableId: env.APPWRITE_STUDENT_PROFILES_TABLE_ID, rowId: profs.rows[0].$id }).catch(() => undefined);
        }

        // Delete auth user
        await users.delete({ userId: studentAuthId }).catch(() => undefined);
        console.log(`Cleaned up synthetic student ${studentAuthId}`);
      }

      if (adminSession?.$id) {
        await users.deleteSession({ userId: adminUserId, sessionId: adminSession.$id }).catch(() => undefined);
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }

    console.log(`\n=== RESULTS: Passed ${passed}, Failed ${failed} ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
