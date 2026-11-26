import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedOrigin } from "../src/lib/security";
import { checkRateLimit } from "../src/lib/rate-limit";
import { checkRequiredEnv, ENROLLMENT_REQUIRED_ENV } from "../src/lib/env";
import { normalizeWorkMode } from "../src/lib/documents/document-validation";
import { signPreview, verifyPreview } from "../src/lib/documents/preview-token";
import { isDeadlineWithinReminderWindow } from "../src/app/api/cron/deadline-reminders/route";
import { sendCrewlineEmail } from "../src/lib/email";

test("isTrustedOrigin allows same-origin requests and blocks cross-site origins", () => {
  const prevUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://crewline.me";
  try {
    const trusted = new Request("https://crewline.me/api/applications", {
      method: "POST",
      headers: { origin: "https://crewline.me" },
    });
    assert.equal(isTrustedOrigin(trusted), true);

    const untrusted = new Request("https://crewline.me/api/applications", {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    });
    assert.equal(isTrustedOrigin(untrusted), false);

    const badReferer = new Request("https://crewline.me/api/submissions", {
      method: "POST",
      headers: { referer: "https://attacker.test/form" },
    });
    assert.equal(isTrustedOrigin(badReferer), false);
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = prevUrl;
  }
});

test("checkRateLimit enforces per-action limits in memory fallback mode", async () => {
  const req = new Request("https://crewline.me/api/applications", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.42" },
  });
  const action = `test-action-${Date.now()}`;
  const first = await checkRateLimit(req, action, 2);
  const second = await checkRateLimit(req, action, 2);
  const third = await checkRateLimit(req, action, 2);
  assert.equal(first.limited, false);
  assert.equal(second.limited, false);
  assert.equal(third.limited, true);
});

test("signPreview and verifyPreview require CREWLINE_PREVIEW_SECRET and reject tampering", () => {
  const prevSecret = process.env.CREWLINE_PREVIEW_SECRET;
  process.env.CREWLINE_PREVIEW_SECRET = "test-preview-secret-at-least-16-chars";
  try {
    const token = signPreview({
      createdAt: Date.now(),
      snapshot: {
        documentType: "offer",
        documentId: "CW-OFFER-2026-ABC123",
        studentId: "stu-1",
        studentName: "Test Student",
        documentTitle: "Web Development Internship",
        domain: "Web Development",
        duration: "1 Month",
        startDate: "2026-11-26T00:00:00.000Z",
        endDate: "2026-12-26T00:00:00.000Z",
        completionDate: "2026-11-26T00:00:00.000Z",
        issueDate: "2026-11-26T00:00:00.000Z",
        workMode: "Virtual / Remote",
        stipend: "",
        terms: "",
        sourceId: "app-1",
        internshipId: "int-1",
        projectTitle: "",
        signatoryName: "Signatory",
        signatoryDesignation: "Founder",
        signatorySignatureFileId: "",
        templateVersion: "1.0",
        verificationUrl: "",
        reissuedFrom: "",
        reissueReason: "",
      },
    });
    const verified = verifyPreview(token);
    assert.ok(verified);
    assert.equal(verified.snapshot.documentId, "CW-OFFER-2026-ABC123");
    assert.equal(verifyPreview(`${token}tampered`), null);
  } finally {
    process.env.CREWLINE_PREVIEW_SECRET = prevSecret;
  }
});

test("normalizeWorkMode aligns raw DB enums and display labels", () => {
  assert.equal(normalizeWorkMode("remote"), "Virtual / Remote");
  assert.equal(normalizeWorkMode("Virtual / Remote"), "Virtual / Remote");
  assert.equal(normalizeWorkMode("hybrid"), "Hybrid");
  assert.equal(normalizeWorkMode("onsite"), "On-site");
});

test("checkRequiredEnv reports missing keys without exposing values", () => {
  const result = checkRequiredEnv(["DEFINITELY_MISSING_CREWLINE_ENV_VAR"]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["DEFINITELY_MISSING_CREWLINE_ENV_VAR"]);
  assert.ok(ENROLLMENT_REQUIRED_ENV.includes("APPWRITE_DATABASE_ID"));
  assert.equal((ENROLLMENT_REQUIRED_ENV as readonly string[]).includes("APPWRITE_ENROLLMENTS_TABLE_ID"), false);
});

test("isDeadlineWithinReminderWindow matches 0-2 days before deadline only", () => {
  assert.deepEqual(isDeadlineWithinReminderWindow("2026-11-28T00:00:00.000Z", "2026-11-26"), {
    eligible: true,
    daysRemaining: 2,
  });
  assert.deepEqual(isDeadlineWithinReminderWindow("2026-11-26T00:00:00.000Z", "2026-11-26"), {
    eligible: true,
    daysRemaining: 0,
  });
  assert.equal(isDeadlineWithinReminderWindow("2026-11-29T00:00:00.000Z", "2026-11-26").eligible, false);
  assert.equal(isDeadlineWithinReminderWindow("2026-11-25T00:00:00.000Z", "2026-11-26").eligible, false);
});

test("sendCrewlineEmail safely skips when CREWLINE_EMAILS_ENABLED is not true", async () => {
  const prev = process.env.CREWLINE_EMAILS_ENABLED;
  process.env.CREWLINE_EMAILS_ENABLED = "false";
  try {
    const res = await sendCrewlineEmail({
      userId: "stu-1",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    assert.equal(res.sent, false);
    assert.equal(res.skipped, true);
    assert.equal(res.reason, "emails_disabled");
  } finally {
    process.env.CREWLINE_EMAILS_ENABLED = prev;
  }
});
