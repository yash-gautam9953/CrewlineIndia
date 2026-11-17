import { NextResponse } from "next/server";
import { ID, Messaging, Permission, Query, Role } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";

const httpsUrl = z.url({ protocol: /^https$/ }).max(2048);
const schema = z.object({
  offerStartDate: z.iso.date(),
  offerDuration: z.string().trim().min(1).max(80),
  offerMode: z.enum(["remote", "hybrid", "onsite"]),
  offerStipend: z.string().trim().max(120).optional().default(""),
  whatsappLink: httpsUrl,
  googleFormLink: z.union([httpsUrl, z.literal("")]).optional().default(""),
  offerNotes: z.string().trim().max(3000).optional().default(""),
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function offerEmail(input: z.infer<typeof schema>, applicant: Record<string, unknown>, program: Record<string, unknown>) {
  const fullName = escapeHtml(String(applicant.studentName ?? "Student"));
  const title = escapeHtml(String(program.title ?? "Internship program"));
  const domain = escapeHtml(String(program.domain ?? ""));
  const date = new Date(`${input.offerStartDate}T00:00:00.000Z`).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "UTC" });
  const details = [
    ["Internship", title], ["Domain", domain], ["Start date", escapeHtml(date)],
    ["Duration", escapeHtml(input.offerDuration)], ["Mode", escapeHtml(input.offerMode)],
    ...(input.offerStipend ? [["Stipend", escapeHtml(input.offerStipend)]] : []),
  ];
  const rows = details.map(([label, value]) => `<tr><td style="padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0">${label}</td><td style="padding:10px 14px;color:#101d35;font-weight:600;border-bottom:1px solid #e2e8f0">${value}</td></tr>`).join("");
  const notes = input.offerNotes ? `<p style="margin:22px 0;line-height:1.7;color:#475569">${escapeHtml(input.offerNotes).replace(/\n/g, "<br>")}</p>` : "";
  const formLink = input.googleFormLink ? `<p style="margin:18px 0"><a href="${escapeHtml(input.googleFormLink)}" style="color:#087bff;font-weight:700">Continue to the next step form</a></p>` : "";
  return `<div style="max-width:640px;margin:0 auto;padding:32px 20px;font-family:Arial,sans-serif;color:#101d35"><p style="font-size:12px;font-weight:700;letter-spacing:2px;color:#087bff">CREWLINE · INTERNSHIP OFFER</p><h1 style="font-size:28px;line-height:1.25">Internship offer</h1><p style="line-height:1.7;color:#475569">Dear ${fullName},</p><p style="line-height:1.7;color:#475569">We are pleased to offer you a place in the following Crewline internship program. Please review the details below.</p><table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px">${rows}</table>${notes}<p style="margin:22px 0;line-height:1.7;color:#475569">To continue, join the WhatsApp channel using the link below. Crewline will coordinate the remaining process there.</p><p style="margin:20px 0"><a href="${escapeHtml(input.whatsappLink)}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#087bff;color:#ffffff;text-decoration:none;font-weight:700">Continue on WhatsApp</a></p>${formLink}<p style="margin-top:28px;line-height:1.7;color:#475569">Regards,<br><strong>Crewline</strong><br>Learn. Build. Get Recognized.</p><hr style="border:0;border-top:1px solid #e2e8f0;margin-top:30px"><p style="font-size:11px;line-height:1.6;color:#94a3b8">This message relates to the internship application you submitted to Crewline. For questions, contact Crewline through its published contact channel.</p></div>`;
}

export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  if (isRateLimited(request, "admin-offer-send", 10)) return NextResponse.json({ error: "Too many offer requests. Please wait before trying again." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const { applicationId } = await params;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Complete the required offer details and use secure HTTPS links." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const applicationsTable = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const internshipsTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  if (!service || !applicationsTable || !internshipsTable) return NextResponse.json({ error: "Offer service is not configured." }, { status: 503 });

  let application: Record<string, unknown> & { $id: string; internshipId: string; studentId: string; studentEmail: string; status: string };
  let program: Record<string, unknown> & { $id: string };
  try {
    const row = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: applicationsTable, rowId: applicationId });
    application = row as unknown as typeof application;
    if (application.offerStatus === "sent" || application.offerStatus === "draft") return NextResponse.json({ error: "An offer email is already sent or being processed for this application." }, { status: 409 });
    const internship = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipsTable, rowId: application.internshipId });
    program = internship as unknown as typeof program;
  } catch {
    return NextResponse.json({ error: "Application or internship was not found." }, { status: 404 });
  }
  if (typeof application.studentEmail !== "string" || typeof application.studentId !== "string") return NextResponse.json({ error: "Application is missing student email details." }, { status: 400 });
  if (application.status !== "approved") return NextResponse.json({ error: "Approve this application before sending an offer." }, { status: 409 });

  const values = {
    offerStatus: "draft",
    offerStartDate: new Date(`${input.data.offerStartDate}T00:00:00.000Z`).toISOString(),
    offerDuration: input.data.offerDuration,
    offerMode: input.data.offerMode,
    offerStipend: input.data.offerStipend,
    offerNotes: input.data.offerNotes,
    whatsappLink: input.data.whatsappLink,
    googleFormLink: input.data.googleFormLink,
  };
  try {
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId: applicationsTable, rowId: applicationId, data: values });
    const message = await new Messaging(service.client).createEmail({
      messageId: ID.unique(),
      subject: `Crewline internship offer: ${String(program.title ?? "Internship program")}`.replace(/[\r\n]+/g, " "),
      content: offerEmail(input.data, application, program),
      users: [application.studentId],
      html: true,
    });
    await service.tablesDB.updateRow({
      databaseId: service.databaseId,
      tableId: applicationsTable,
      rowId: applicationId,
      data: { ...values, offerStatus: "sent", status: "approved", offerSentAt: new Date().toISOString(), offerSentBy: admin.$id, emailMessageId: message.$id },
    });
    let enrolled = false;
    const enrollmentsTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
    if (enrollmentsTable) {
      try {
        const matches = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentsTable, queries: [Query.equal("studentId", application.studentId), Query.equal("internshipId", application.internshipId), Query.limit(1)] });
        if (!matches.rows.length) {
          await service.tablesDB.createRow({
            databaseId: service.databaseId,
            tableId: enrollmentsTable,
            rowId: ID.unique(),
            data: { studentId: application.studentId, internshipId: application.internshipId, applicationId, status: "active", startedAt: new Date().toISOString() },
            permissions: [Permission.read(Role.user(application.studentId))],
          });
        }
        enrolled = true;
      } catch { enrolled = false; }
    }
    return NextResponse.json({ sent: true, enrolled });
  } catch {
    try { await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId: applicationsTable, rowId: applicationId, data: { ...values, offerStatus: "failed" } }); } catch { /* keep the original send failure generic */ }
    return NextResponse.json({ error: "Offer details were saved, but Appwrite could not send the email. Check the email provider and API key scopes before retrying." }, { status: 502 });
  }
}
