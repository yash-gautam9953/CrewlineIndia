import "server-only";
import { ID, Messaging } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export type EmailResult = {
  sent: boolean;
  skipped: boolean;
  messageId?: string;
  reason?: string;
};

export async function sendCrewlineEmail(params: {
  userId: string;
  subject: string;
  html: string;
  attachments?: string[];
}): Promise<EmailResult> {
  if (process.env.CREWLINE_EMAILS_ENABLED !== "true") {
    return { sent: false, skipped: true, reason: "emails_disabled" };
  }

  const service = createPrivilegedAppwriteClient();
  if (!service) {
    return { sent: false, skipped: true, reason: "appwrite_not_configured" };
  }

  try {
    const message = await new Messaging(service.client).createEmail({
      messageId: ID.unique(),
      subject: params.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
      content: params.html,
      users: [params.userId],
      html: true,
      ...(params.attachments?.length ? { attachments: params.attachments } : {}),
    });
    return { sent: true, skipped: false, messageId: message.$id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Email delivery failed";
    console.error("[email] Appwrite Messaging failed:", reason);
    return { sent: false, skipped: false, reason };
  }
}

function wrapEmail(eyebrow: string, title: string, bodyHtml: string) {
  const appUrl = escapeHtml((process.env.NEXT_PUBLIC_APP_URL || "https://crewline.me").replace(/\/$/, ""));
  return `<div style="max-width:640px;margin:0 auto;padding:32px 20px;font-family:Arial,sans-serif;color:#101d35">
    <p style="font-size:12px;font-weight:700;letter-spacing:2px;color:#1769D2;margin:0 0 8px">${escapeHtml(eyebrow)}</p>
    <h1 style="font-size:24px;line-height:1.3;margin:0 0 18px;color:#123B70">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <p style="margin:24px 0"><a href="${appUrl}/account" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1769D2;color:#ffffff;text-decoration:none;font-weight:700">Open Student Workspace</a></p>
    <p style="margin-top:28px;line-height:1.7;color:#475569">Regards,<br><strong>Crewline</strong><br>Learn. Build. Get Recognized.</p>
  </div>`;
}

export function enrollmentConfirmationEmail(params: {
  studentName: string;
  internshipTitle: string;
  startDate: string;
  endDate: string;
  deadlineDate: string;
  offerIssued: boolean;
}) {
  return wrapEmail(
    "CREWLINE · ENROLLMENT ACTIVE",
    `Welcome to ${params.internshipTitle}`,
    `<p style="line-height:1.7;color:#475569">Dear ${escapeHtml(params.studentName)},</p>
     <p style="line-height:1.7;color:#475569">Your enrollment in <strong>${escapeHtml(params.internshipTitle)}</strong> is now active.</p>
     <ul style="line-height:1.8;color:#101d35">
       <li><strong>Start Date:</strong> ${escapeHtml(params.startDate)}</li>
       <li><strong>Scheduled End Date:</strong> ${escapeHtml(params.endDate)}</li>
       <li><strong>Project Submission Deadline:</strong> ${escapeHtml(params.deadlineDate)}</li>
       <li><strong>Offer Letter:</strong> ${params.offerIssued ? "Ready to download in My Documents" : "Being prepared in your workspace"}</li>
     </ul>`
  );
}

export function submissionReviewEmail(params: {
  decision: string;
  feedback: string;
  certificatesIssued: boolean;
}) {
  const label = params.decision === "approved" ? "Approved" : params.decision === "revision_required" ? "Revision Required" : "Rejected";
  return wrapEmail(
    "CREWLINE · PROJECT REVIEW",
    `Project submission ${label}`,
    `<p style="line-height:1.7;color:#475569">Your project submission has been reviewed with status: <strong>${escapeHtml(label)}</strong>.</p>
     <p style="line-height:1.7;color:#475569"><strong>Mentor Feedback:</strong><br>${escapeHtml(params.feedback).replace(/\n/g, "<br>")}</p>
     ${params.certificatesIssued ? `<p style="line-height:1.7;color:#047857;font-weight:600">Your Internship and Project Completion Certificates are now available in your Student Workspace.</p>` : ""}`
  );
}

export function paymentVerificationEmail(params: { status: string; reason?: string }) {
  const label = params.status.replaceAll("_", " ");
  return wrapEmail(
    "CREWLINE · PAYMENT UPDATE",
    `Payment status: ${label}`,
    `<p style="line-height:1.7;color:#475569">Your payment verification status has been updated to <strong>${escapeHtml(label)}</strong>.</p>
     ${params.reason ? `<p style="line-height:1.7;color:#475569"><strong>Note:</strong> ${escapeHtml(params.reason)}</p>` : ""}`
  );
}

export function deadlineReminderEmail(params: { deadlineDate: string; daysRemaining: number }) {
  return wrapEmail(
    "CREWLINE · DEADLINE REMINDER",
    "Project submission deadline approaching",
    `<p style="line-height:1.7;color:#475569">This is a reminder that your internship project submission deadline is on <strong>${escapeHtml(params.deadlineDate)}</strong> (${params.daysRemaining} ${params.daysRemaining === 1 ? "day" : "days"} remaining).</p>
     <p style="line-height:1.7;color:#475569">Please submit your project repository, live link, or supporting files in your Student Workspace before the deadline.</p>`
  );
}
