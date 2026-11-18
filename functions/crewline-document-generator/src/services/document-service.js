import { Permission, Role } from "node-appwrite";
import { generateDocumentId } from "../utils/document-id.js";
import { getEventKey } from "../utils/idempotency.js";
import { generateQrCodeDataUrl } from "../utils/qr-generator.js";
import { renderDocumentTemplate } from "../utils/template-renderer.js";
import { generatePdfFromHtml } from "./pdf-service.js";
import { EligibilityService } from "./eligibility-service.js";
import { DatabaseService } from "./database-service.js";
import { StorageService } from "./storage-service.js";
import { getEnv } from "../config/env.js";

/**
 * Unified Document Service for Crewline Document Engine.
 * Handles generation, rendering, storage, and persistence for Offer Letters and Certificates.
 */
export class DocumentService {
  constructor(customConfig = null) {
    this.env = getEnv();
    this.db = new DatabaseService(customConfig);
    this.storage = new StorageService(customConfig);
  }

  /**
   * Generates and issues a document idempotently.
   *
   * @param {object} params
   * @param {"offer" | "internship_completion" | "project_completion"} params.documentType
   * @param {string} params.sourceId - applicationId | enrollmentId | submissionId
   * @param {string} [params.issuedBy="system"]
   * @param {object} [params.options={}]
   * @param {boolean} [params.forceRegenerate=false]
   * @returns {Promise<object>}
   */
  async issueDocument({
    documentType,
    sourceId,
    issuedBy = "system",
    options = {},
    forceRegenerate = false,
  }) {
    if (!["offer", "internship_completion", "project_completion"].includes(documentType)) {
      throw new Error(`Unsupported document type: ${documentType}`);
    }

    const eventKey = getEventKey(documentType, sourceId, options.reissueFromId);

    // Idempotency check: return existing document if already issued
    if (!forceRegenerate) {
      const existing = await this.db.findDocumentByEventKey(eventKey);
      if (existing) {
        return {
          success: true,
          documentId: existing.$id,
          documentType,
          studentId: existing.studentId,
          studentName: existing.studentName,
          fileId: existing.storageFileId,
          alreadyIssued: true,
          record: existing,
        };
      }
    }

    // Step 1: Enforce server-side eligibility
    let payload;
    if (documentType === "offer") {
      payload = await EligibilityService.validateOfferLetter(sourceId, this.db, options);
    } else if (documentType === "internship_completion") {
      payload = await EligibilityService.validateInternshipCertificate(sourceId, this.db);
    } else if (documentType === "project_completion") {
      payload = await EligibilityService.validateProjectCertificate(sourceId, this.db);
    }

    const documentId = generateDocumentId(documentType);
    const nowIso = new Date().toISOString();

    // Step 2: Signatory settings
    const signatory = await this.db.getSignatorySettings();
    let signatureDataUrl = null;
    if (signatory.signatureFileId) {
      signatureDataUrl = await this.storage.getSignatureDataUrl(signatory.signatureFileId);
    }

    // Step 3: Verification URL and QR Code for certificates
    let verificationUrl = "";
    let qrCodeDataUrl = null;
    if (documentType !== "offer") {
      verificationUrl = `${this.env.appUrl}/verify/${encodeURIComponent(documentId)}`;
      qrCodeDataUrl = await generateQrCodeDataUrl(verificationUrl);
    }

    // Assemble unified document data for template rendering
    const documentData = {
      ...payload,
      documentId,
      issueDate: nowIso,
      verificationUrl,
      signatoryName: signatory.name,
      signatoryDesignation: signatory.designation,
    };

    // Step 4: Render HTML with all assets inlined
    const renderedHtml = await renderDocumentTemplate({
      documentType,
      data: documentData,
      signatureDataUrl,
      qrCodeDataUrl,
    });

    // Step 5: Generate PDF with Playwright Chromium
    const isLandscape = documentType !== "offer";
    const pdfBuffer = await generatePdfFromHtml(renderedHtml, { landscape: isLandscape });

    // Step 6: Upload PDF to Appwrite Storage with student read permissions
    const fileName = `${documentId}.pdf`;
    const uploadedFile = await this.storage.uploadDocumentPdf(
      pdfBuffer,
      fileName,
      payload.studentId
    );

    // Step 7: Persist Document Record in Database
    let row;
    try {
      const permissions = payload.studentId
        ? [Permission.read(Role.user(payload.studentId))]
        : [];

      row = await this.db.createDocumentRecord(
        documentId,
        {
          documentType,
          eventKey,
          studentId: payload.studentId,
          studentName: payload.studentName,
          internshipId: payload.internshipId || null,
          sourceId,
          documentTitle: documentType === "project_completion" ? payload.projectTitle : payload.documentTitle,
          documentDomain: payload.domain || null,
          duration: payload.duration || null,
          issueDate: nowIso,
          status: "valid",
          storageFileId: uploadedFile.$id,
          snapshot: JSON.stringify(documentData),
          signatoryName: signatory.name,
          signatoryDesignation: signatory.designation,
          signatorySignatureFileId: signatory.signatureFileId || null,
          templateVersion: "1.0",
          issuedBy,
          revokedAt: null,
          revocationReason: null,
          reissuedFrom: options.reissueFromId || null,
        },
        permissions
      );
    } catch (dbError) {
      // Step 7b: Rollback storage file on DB error to avoid orphaned assets
      await this.storage.deleteFile(uploadedFile.$id);
      throw dbError;
    }

    // Step 8: Post-issuance lifecycle side effects
    if (documentType === "offer") {
      await this.db.updateApplicationOfferStatus(sourceId, "sent");
    }

    await this.db.logAudit(issuedBy, "document.issued", documentId, {
      type: documentType,
      studentId: payload.studentId,
      sourceId,
      reissuedFrom: options.reissueFromId || undefined,
    });

    const docLabels = {
      offer: "Offer Letter",
      internship_completion: "Internship Completion Certificate",
      project_completion: "Project Completion Certificate",
    };

    await this.db.createNotification(
      payload.studentId,
      `${docLabels[documentType]} Ready`,
      `Your ${docLabels[documentType].toLowerCase()} is now available in your dashboard.`,
      {
        eventKey: `doc-issued:${documentId}`,
        targetUrl: "/account",
      }
    );

    return {
      success: true,
      documentId,
      documentType,
      studentId: payload.studentId,
      studentName: payload.studentName,
      fileId: uploadedFile.$id,
      alreadyIssued: false,
      record: row,
    };
  }
}
