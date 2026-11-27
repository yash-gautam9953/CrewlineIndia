import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security";
import { generateDocumentId } from "@/lib/documents/document-id-generator";
import { normalizeWorkMode, readSignatorySettings, type DocumentSnapshot } from "@/lib/documents/document-validation";
import { getDocumentAssets, storeIssuedDocument } from "@/lib/documents/document-service";
import { renderDocumentHtml } from "@/lib/documents/templates";

const schema = z
  .object({
    documentType: z.enum(["internship_completion", "project_completion", "offer"]),
    studentName: z.string().trim().min(2, "Enter the student's full name.").max(160),
    studentEmail: z.union([z.literal(""), z.email("Enter a valid student email.")]).optional().default(""),
    documentTitle: z.string().trim().min(2, "Enter the internship title / role.").max(180),
    domain: z.string().trim().min(2, "Enter the domain.").max(120),
    projectTitle: z.string().trim().max(180).optional().default(""),
    duration: z.string().trim().max(80).optional().default("1 Month"),
    startDate: z.union([z.literal(""), z.iso.date()]).optional().default(""),
    endDate: z.union([z.literal(""), z.iso.date()]).optional().default(""),
    issueDate: z.union([z.literal(""), z.iso.date()]).optional().default(""),
    workMode: z.enum(["Virtual / Remote", "Hybrid", "On-site"]).optional().default("Virtual / Remote"),
    stipend: z.string().trim().max(120).optional().default(""),
    terms: z.string().trim().max(1200).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.documentType === "project_completion" && value.projectTitle.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["projectTitle"],
        message: "Enter the project title for a Project Completion Certificate.",
      });
    }
    if (value.documentType !== "project_completion" && (!value.startDate || !value.endDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "Select both start date and end date.",
      });
    }
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }
  });

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }
  const rl = await checkRateLimit(request, "admin-custom-certificate", 20);
  if (rl.limited) {
    return NextResponse.json(
      { error: rl.unavailable ? "Service temporarily unavailable." : "Too many certificate requests. Try again shortly." },
      { status: rl.unavailable ? 503 : 429 }
    );
  }
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please complete all required certificate fields." },
      { status: 400 }
    );
  }

  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) {
    return NextResponse.json({ error: "Document service is not configured." }, { status: 503 });
  }

  try {
    const data = parsed.data;
    const signatory = await readSignatorySettings();
    const documentId = generateDocumentId(data.documentType);

    let studentId = `custom:${documentId}`;
    if (data.studentEmail) {
      const profiles = await service.tablesDB
        .listRows({
          databaseId: service.databaseId,
          tableId: resources.tables.studentProfiles,
          queries: [Query.equal("email", data.studentEmail.toLowerCase()), Query.limit(1)],
        })
        .catch(() => ({ rows: [] }));
      const matchedAuthId = profiles.rows[0]?.authUserId;
      if (typeof matchedAuthId === "string" && matchedAuthId.trim()) {
        studentId = matchedAuthId.trim();
      }
    }

    const nowIso = data.issueDate ? new Date(`${data.issueDate}T00:00:00.000Z`).toISOString() : new Date().toISOString();
    const startIso = data.startDate ? new Date(`${data.startDate}T00:00:00.000Z`).toISOString() : nowIso;
    const endIso = data.endDate ? new Date(`${data.endDate}T00:00:00.000Z`).toISOString() : nowIso;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://crewline.me").replace(/\/$/, "");
    const verificationUrl = data.documentType === "offer" ? "" : `${appUrl}/verify/${encodeURIComponent(documentId)}`;

    const snapshot: DocumentSnapshot = {
      documentType: data.documentType,
      documentId,
      studentId,
      studentName: data.studentName,
      documentTitle: data.documentTitle,
      domain: data.domain,
      duration: data.documentType === "project_completion" ? "" : data.duration || "1 Month",
      startDate: startIso,
      endDate: endIso,
      completionDate: endIso,
      issueDate: nowIso,
      workMode: normalizeWorkMode(data.workMode),
      stipend: data.stipend,
      terms: data.terms,
      sourceId: `custom:${documentId}`,
      internshipId: "",
      projectTitle: data.projectTitle,
      signatoryName: signatory.name,
      signatoryDesignation: signatory.designation,
      signatorySignatureFileId: signatory.signatureFileId,
      templateVersion: "1.0",
      verificationUrl,
      reissuedFrom: "",
      reissueReason: "",
    };

    const assets = await getDocumentAssets();
    const html = await renderDocumentHtml(snapshot, assets);
    await storeIssuedDocument(snapshot, html, admin.$id);

    return NextResponse.json(
      {
        issued: true,
        documentId,
        downloadUrl: `/api/documents/${encodeURIComponent(documentId)}/download`,
        verifyUrl: verificationUrl ? `/verify/${encodeURIComponent(documentId)}` : "",
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate custom certificate.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
