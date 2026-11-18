import test from "node:test";
import assert from "node:assert/strict";
import { generateDocumentId, isValidDocumentId } from "../utils/document-id.js";
import { getEventKey } from "../utils/idempotency.js";
import { EligibilityService } from "../services/eligibility-service.js";
import mainFunction from "../main.js";

test("Document ID: Format and uniqueness generation", () => {
  const offerId = generateDocumentId("offer");
  const certId = generateDocumentId("internship_completion");
  const projId = generateDocumentId("project_completion");

  assert.ok(offerId.startsWith("CW-OFFER-202"), `Unexpected offer ID prefix: ${offerId}`);
  assert.ok(certId.startsWith("CW-INT-202"), `Unexpected cert ID prefix: ${certId}`);
  assert.ok(projId.startsWith("CW-PROJ-202"), `Unexpected proj ID prefix: ${projId}`);

  assert.ok(isValidDocumentId(offerId), `Offer ID failed schema validation: ${offerId}`);
  assert.ok(isValidDocumentId(certId), `Cert ID failed schema validation: ${certId}`);
  assert.ok(isValidDocumentId(projId), `Proj ID failed schema validation: ${projId}`);

  // Test set uniqueness across 50 iterations
  const ids = new Set();
  for (let i = 0; i < 50; i++) {
    ids.add(generateDocumentId("offer"));
  }
  assert.equal(ids.size, 50, "Random document ID generator produced a collision in 50 iterations");
});

test("Idempotency: Deterministic eventKey creation", () => {
  const key1 = getEventKey("offer", "app_123");
  const key2 = getEventKey("offer", "app_123");
  assert.equal(key1, "offer:app_123");
  assert.equal(key1, key2, "Event key must be strictly deterministic");

  const reissueKey = getEventKey("internship_completion", "enr_456", "doc_old789");
  assert.equal(reissueKey, "internship_completion:enr_456:reissue:doc_old789");

  assert.throws(() => getEventKey("", "app_123"), /required/);
});

test("Eligibility: Rejects unapproved applications for offer letter", async () => {
  const mockDb = {
    getApplication: async () => ({
      status: "pending",
      internshipId: "int_1",
      studentId: "usr_1",
    }),
  };

  await assert.rejects(
    async () => {
      await EligibilityService.validateOfferLetter("app_pending", mockDb);
    },
    {
      message: /approved applications/,
    }
  );
});

test("Eligibility: Rejects uncompleted enrollment for completion certificate", async () => {
  const mockDb = {
    getEnrollment: async () => ({
      status: "active",
      internshipId: "int_1",
      studentId: "usr_1",
    }),
  };

  await assert.rejects(
    async () => {
      await EligibilityService.validateInternshipCertificate("enr_active", mockDb);
    },
    {
      message: /requires enrollment status 'completed'/,
    }
  );
});

test("Eligibility: Enforces approved review for project certificate", async () => {
  const mockDb = {
    tables: { reviews: "tbl_reviews" },
    getSubmission: async () => ({
      status: "approved",
      taskId: "tsk_1",
      enrollmentId: "enr_1",
      studentId: "usr_1",
    }),
    getTask: async () => ({ title: "Build Chatbot" }),
    getEnrollment: async () => ({ $id: "enr_1", internshipId: "int_1" }),
    getInternship: async () => ({ title: "AI Intern", domain: "AI" }),
    getStudentProfileByAuthId: async () => ({ fullName: "Test Student" }),
    getLatestApprovedReview: async () => null, // No review!
    getPaymentRecord: async () => null,
  };

  await assert.rejects(
    async () => {
      await EligibilityService.validateProjectCertificate("sub_no_review", mockDb);
    },
    {
      message: /approved mentor review must be recorded/,
    }
  );
});

test("Appwrite Function Entrypoint: Handles health check and validation", async () => {
  let responseData = null;
  let responseCode = null;

  const mockRes = {
    json: (data, code = 200) => {
      responseData = data;
      responseCode = code;
      return data;
    },
    text: (text, code = 200) => {
      responseData = text;
      responseCode = code;
      return text;
    },
  };

  const logs = [];
  const errors = [];
  const mockLog = (msg) => logs.push(msg);
  const mockError = (msg) => errors.push(msg);

  // 1. Health check
  await mainFunction({
    req: { body: { action: "health" } },
    res: mockRes,
    log: mockLog,
    error: mockError,
  });
  assert.equal(responseCode, 200);
  assert.equal(responseData.status, "ok");

  // 2. Missing documentType
  await mainFunction({
    req: { body: {} },
    res: mockRes,
    log: mockLog,
    error: mockError,
  });
  assert.equal(responseCode, 400);
  assert.ok(responseData.error.includes("Missing required field 'documentType'"));

  // 3. Unsupported documentType
  await mainFunction({
    req: { body: { documentType: "diploma" } },
    res: mockRes,
    log: mockLog,
    error: mockError,
  });
  assert.equal(responseCode, 400);
  assert.ok(responseData.error.includes("Unsupported documentType"));
});
