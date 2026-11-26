import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ID, Permission, Query, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { prepareDocument, type DocumentSnapshot } from "./document-validation";
import { generateDocumentId, getEventKey, type DocumentType } from "./document-id-generator";
import { generatePdf } from "./pdf-generator";
import { renderDocumentHtml } from "./templates";
import { invokeDocumentFunction, isDocumentFunctionConfigured } from "./function-client";

export async function getDocumentsConfig() {
  const service = createPrivilegedAppwriteClient();
  if (!service) return null;
  const resources = await getAppwriteResources().catch(() => null);
  if (!resources) return null;
  return {
    ...service,
    tableId: resources.tables.documents,
    bucketId: resources.buckets.documentsBucket,
    storage: new Storage(service.client),
  };
}

export async function getDocumentAssets() {
  const [logoBytes, signatureBytes, badgeBytes, interRegular, interBold, poppinsSemiBold, poppinsBold] = await Promise.all([
    readFile(join(process.cwd(), "public", "brand-logo.png")),
    readFile(join(process.cwd(), "public", "yash-sign.png")),
    readFile(join(process.cwd(), "public", "crewline-badge-transparent.png")).catch(() => Buffer.from("")),
    readFile(join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-400-normal.woff2")),
    readFile(join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-700-normal.woff2")),
    readFile(join(process.cwd(), "node_modules", "@fontsource", "poppins", "files", "poppins-latin-600-normal.woff2")),
    readFile(join(process.cwd(), "node_modules", "@fontsource", "poppins", "files", "poppins-latin-700-normal.woff2")),
  ]);
  return {
    logo: `data:image/png;base64,${logoBytes.toString("base64")}`,
    signature: `data:image/png;base64,${Buffer.from(signatureBytes).toString("base64")}`,
    badge: badgeBytes.length ? `data:image/png;base64,${badgeBytes.toString("base64")}` : undefined,
    fonts: {
      interRegular: `data:font/woff2;base64,${interRegular.toString("base64")}`,
      interBold: `data:font/woff2;base64,${interBold.toString("base64")}`,
      poppinsSemiBold: `data:font/woff2;base64,${poppinsSemiBold.toString("base64")}`,
      poppinsBold: `data:font/woff2;base64,${poppinsBold.toString("base64")}`,
    },
  };
}

export async function storeIssuedDocument(snapshot: DocumentSnapshot, html: string, issuedBy: string) {
  const config = await getDocumentsConfig();
  if (!config) throw new Error("Document storage is not configured.");
  const eventKey = getEventKey(snapshot.documentType, snapshot.sourceId, snapshot.reissuedFrom);
  const duplicates = await config.tablesDB.listRows({ databaseId: config.databaseId, tableId: config.tableId, queries: [Query.equal("eventKey", eventKey), Query.limit(1)] });
  if (duplicates.total) throw new Error("A document has already been issued for this event. Use an authorized reissue workflow if a correction is required.");

  const pdf = await generatePdf(html, snapshot.documentType !== "offer");
  const fileId = ID.unique();
  const file = await config.storage.createFile({ bucketId: config.bucketId, fileId, file: InputFile.fromBuffer(pdf, `${snapshot.documentId}.pdf`), permissions: [Permission.read(Role.user(snapshot.studentId))] });
  try {
    const row = await config.tablesDB.createRow({
      databaseId: config.databaseId,
      tableId: config.tableId,
      rowId: snapshot.documentId,
      data: {
        documentType: snapshot.documentType,
        eventKey,
        studentId: snapshot.studentId,
        studentName: snapshot.studentName,
        internshipId: snapshot.internshipId || null,
        sourceId: snapshot.sourceId,
        documentTitle: snapshot.documentType === "project_completion" ? snapshot.projectTitle : snapshot.documentTitle,
        documentDomain: snapshot.domain || null,
        duration: snapshot.duration || null,
        issueDate: snapshot.issueDate,
        status: "valid",
        storageFileId: file.$id,
        snapshot: JSON.stringify(snapshot),
        signatoryName: snapshot.signatoryName,
        signatoryDesignation: snapshot.signatoryDesignation,
        signatorySignatureFileId: snapshot.signatorySignatureFileId,
        templateVersion: snapshot.templateVersion,
        issuedBy,
        revokedAt: null,
        revocationReason: null,
        reissuedFrom: snapshot.reissuedFrom || null,
      },
      permissions: [Permission.read(Role.user(snapshot.studentId))],
    });
    await writeAuditLog(config, issuedBy, "document.issued", snapshot.documentId, { type: snapshot.documentType, studentId: snapshot.studentId, sourceId: snapshot.sourceId, reissuedFrom: snapshot.reissuedFrom || undefined, reissueReason: snapshot.reissueReason || undefined });
    return row;
  } catch (error) {
    try { await config.storage.deleteFile({ bucketId: config.bucketId, fileId: file.$id }); } catch { /* best-effort orphan cleanup */ }
    throw error;
  }
}

export async function writeAuditLog(config: { tablesDB: NonNullable<ReturnType<typeof createPrivilegedAppwriteClient>>["tablesDB"]; databaseId: string }, actorId: string, action: string, resourceId: string, details: Record<string, unknown>, resourceType = "document") {
  try {
    const { tables } = await getAppwriteResources();
    await config.tablesDB.createRow({ databaseId: config.databaseId, tableId: tables.auditLogs, rowId: ID.unique(), data: { actorId, action, resourceType, resourceId, details: JSON.stringify(details), ipHash: null, occurredAt: new Date().toISOString() } });
  } catch { /* document action remains authoritative; monitor missing audit rows */ }
}

export function documentTypeLabel(type: DocumentType) {
  return type === "offer" ? "Offer Letter" : type === "internship_completion" ? "Internship Completion Certificate" : "Project Completion Certificate";
}

export async function autoIssueOfferLetterForApplication(applicationId: string) {
  const config = await getDocumentsConfig();
  if (!config) throw new Error("Document storage is not configured.");
  const { tables } = await getAppwriteResources();

  const eventKey = getEventKey("offer", applicationId);
  const existing = await config.tablesDB.listRows({
    databaseId: config.databaseId,
    tableId: config.tableId,
    queries: [Query.equal("eventKey", eventKey), Query.limit(1)],
  });
  if (existing.rows[0]) {
    return { row: existing.rows[0], alreadyIssued: true };
  }

  let row: Record<string, unknown>;
  if (isDocumentFunctionConfigured()) {
    const fnResult = await invokeDocumentFunction<{ documentId: string; record?: Record<string, unknown>; alreadyIssued?: boolean }>({
      documentType: "offer",
      applicationId,
      issuedBy: "system-auto-enrollment",
    });
    if (fnResult.alreadyIssued && fnResult.record) {
      return { row: fnResult.record, alreadyIssued: true };
    }
    row = fnResult.record ?? { $id: fnResult.documentId };
  } else {
    const documentId = generateDocumentId("offer");
    const snapshot = await prepareDocument("offer", applicationId, documentId);
    const assets = await getDocumentAssets();
    const html = await renderDocumentHtml(snapshot, assets);
    row = await storeIssuedDocument(snapshot, html, "system-auto-enrollment");
  }

  try {
    await config.tablesDB.updateRow({
      databaseId: config.databaseId,
      tableId: tables.applications,
      rowId: applicationId,
      data: {
        offerStatus: "sent",
        offerSentAt: new Date().toISOString(),
        offerSentBy: "system",
      },
    });
  } catch (err) {
    console.error("[auto-offer] Could not update application offerStatus:", err);
  }

  return { row, alreadyIssued: false };
}

export async function autoIssueCompletionCertificatesForApprovedSubmission(submissionId: string, issuedBy: string) {
  const config = await getDocumentsConfig();
  if (!config) throw new Error("Document storage is not configured.");
  const { tables } = await getAppwriteResources();

  const submission = await config.tablesDB.getRow({
    databaseId: config.databaseId,
    tableId: tables.submissions,
    rowId: submissionId,
  }) as Record<string, unknown>;

  const enrollmentId = String(submission.enrollmentId);
  const assets = await getDocumentAssets();

  // 1. Internship Completion Certificate
  let internshipDocId = "";
  const internshipEventKey = getEventKey("internship_completion", enrollmentId);
  const existingInternship = await config.tablesDB.listRows({
    databaseId: config.databaseId,
    tableId: config.tableId,
    queries: [Query.equal("eventKey", internshipEventKey), Query.limit(1)],
  });
  if (existingInternship.rows[0]) {
    internshipDocId = existingInternship.rows[0].$id;
  } else if (isDocumentFunctionConfigured()) {
    const fnResult = await invokeDocumentFunction<{ documentId: string }>({
      documentType: "internship_completion",
      enrollmentId,
      issuedBy,
    });
    internshipDocId = fnResult.documentId;
  } else {
    const docId = generateDocumentId("internship_completion");
    const snapshot = await prepareDocument("internship_completion", enrollmentId, docId);
    const html = await renderDocumentHtml(snapshot, assets);
    const row = await storeIssuedDocument(snapshot, html, issuedBy);
    internshipDocId = row.$id;
  }

  // 2. Project Completion Certificate
  let projectDocId = "";
  const projectEventKey = getEventKey("project_completion", submissionId);
  const existingProject = await config.tablesDB.listRows({
    databaseId: config.databaseId,
    tableId: config.tableId,
    queries: [Query.equal("eventKey", projectEventKey), Query.limit(1)],
  });
  if (existingProject.rows[0]) {
    projectDocId = existingProject.rows[0].$id;
  } else if (isDocumentFunctionConfigured()) {
    const fnResult = await invokeDocumentFunction<{ documentId: string }>({
      documentType: "project_completion",
      submissionId,
      issuedBy,
    });
    projectDocId = fnResult.documentId;
  } else {
    const docId = generateDocumentId("project_completion");
    const snapshot = await prepareDocument("project_completion", submissionId, docId);
    const html = await renderDocumentHtml(snapshot, assets);
    const row = await storeIssuedDocument(snapshot, html, issuedBy);
    projectDocId = row.$id;
  }

  return { internshipDocId, projectDocId };
}


