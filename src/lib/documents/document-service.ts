import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ID, Permission, Query, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import type { DocumentSnapshot } from "./document-validation";
import type { DocumentType } from "./document-id-generator";
import { generatePdf } from "./pdf-generator";
import { getEventKey } from "./document-id-generator";
import { createNotification } from "@/lib/notifications";

export function getDocumentsConfig() {
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_DOCUMENTS_TABLE_ID;
  const bucketId = process.env.APPWRITE_DOCUMENTS_BUCKET_ID;
  if (!service || !tableId || !bucketId) return null;
  return { ...service, tableId, bucketId, storage: new Storage(service.client) };
}

export async function getDocumentAssets(signatureFileId: string) {
  const config = getDocumentsConfig();
  if (!config) throw new Error("Document storage is not configured.");
  const [logoBytes, signatureBytes, interRegular, interBold, poppinsSemiBold, poppinsBold] = await Promise.all([
    readFile(join(process.cwd(), "public", "brand-logo.png")),
    config.storage.getFileDownload({ bucketId: config.bucketId, fileId: signatureFileId }),
    readFile(join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-400-normal.woff2")),
    readFile(join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-700-normal.woff2")),
    readFile(join(process.cwd(), "node_modules", "@fontsource", "poppins", "files", "poppins-latin-600-normal.woff2")),
    readFile(join(process.cwd(), "node_modules", "@fontsource", "poppins", "files", "poppins-latin-700-normal.woff2")),
  ]);
  return {
    logo: `data:image/png;base64,${logoBytes.toString("base64")}`,
    signature: `data:image/png;base64,${Buffer.from(signatureBytes).toString("base64")}`,
    fonts: {
      interRegular: `data:font/woff2;base64,${interRegular.toString("base64")}`,
      interBold: `data:font/woff2;base64,${interBold.toString("base64")}`,
      poppinsSemiBold: `data:font/woff2;base64,${poppinsSemiBold.toString("base64")}`,
      poppinsBold: `data:font/woff2;base64,${poppinsBold.toString("base64")}`,
    },
  };
}

export async function storeIssuedDocument(snapshot: DocumentSnapshot, html: string, issuedBy: string, options: { notificationEmail?: boolean } = {}) {
  const config = getDocumentsConfig();
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
    await createNotification({ userId: snapshot.studentId, eventKey: `document-issued:${snapshot.documentId}`, title: `${documentTypeLabel(snapshot.documentType)} ready`, body: `Your ${documentTypeLabel(snapshot.documentType).toLowerCase()} is available in My Documents.`, type: "document", targetUrl: "/account", sendEmail: options.notificationEmail }).catch(() => undefined);
    return row;
  } catch (error) {
    try { await config.storage.deleteFile({ bucketId: config.bucketId, fileId: file.$id }); } catch { /* best-effort orphan cleanup */ }
    throw error;
  }
}

export async function writeAuditLog(config: NonNullable<ReturnType<typeof getDocumentsConfig>>, actorId: string, action: string, resourceId: string, details: Record<string, unknown>, resourceType = "document") {
  const auditTable = process.env.APPWRITE_AUDIT_LOGS_TABLE_ID;
  if (!auditTable) return;
  try {
    await config.tablesDB.createRow({ databaseId: config.databaseId, tableId: auditTable, rowId: ID.unique(), data: { actorId, action, resourceType, resourceId, details: JSON.stringify(details), ipHash: null, occurredAt: new Date().toISOString() } });
  } catch { /* document action remains authoritative; monitor missing audit rows */ }
}

export function documentTypeLabel(type: DocumentType) {
  return type === "offer" ? "Offer Letter" : type === "internship_completion" ? "Internship Completion Certificate" : "Project Completion Certificate";
}
