import { Client, TablesDB, Query, ID } from "node-appwrite";
import { getEnv } from "../config/env.js";

/**
 * Appwrite Database Service for Crewline Document Engine.
 * Interacts with tables via node-appwrite TablesDB.
 */
export class DatabaseService {
  constructor(customConfig = null) {
    const env = getEnv();
    this.endpoint = customConfig?.endpoint || env.endpoint;
    this.projectId = customConfig?.projectId || env.projectId;
    this.apiKey = customConfig?.apiKey || env.apiKey;
    this.databaseId = customConfig?.databaseId || env.databaseId;
    this.tables = customConfig?.tables || env.tables;

    if (this.endpoint && this.projectId && this.apiKey) {
      this.client = new Client()
        .setEndpoint(this.endpoint)
        .setProject(this.projectId)
        .setKey(this.apiKey);
      this.tablesDB = new TablesDB(this.client);
    } else {
      this.client = null;
      this.tablesDB = null;
    }
  }

  isConfigured() {
    return Boolean(this.client && this.tablesDB && this.databaseId);
  }

  ensureConfigured() {
    if (!this.isConfigured()) {
      throw new Error("Appwrite database service is not configured with required credentials.");
    }
  }

  async getRow(tableId, rowId) {
    this.ensureConfigured();
    return await this.tablesDB.getRow({
      databaseId: this.databaseId,
      tableId,
      rowId,
    });
  }

  async listRows(tableId, queries = []) {
    this.ensureConfigured();
    return await this.tablesDB.listRows({
      databaseId: this.databaseId,
      tableId,
      queries,
    });
  }

  async createRow(tableId, rowId, data, permissions = []) {
    this.ensureConfigured();
    return await this.tablesDB.createRow({
      databaseId: this.databaseId,
      tableId,
      rowId: rowId || ID.unique(),
      data,
      permissions,
    });
  }

  async updateRow(tableId, rowId, data) {
    this.ensureConfigured();
    return await this.tablesDB.updateRow({
      databaseId: this.databaseId,
      tableId,
      rowId,
      data,
    });
  }

  async getApplication(applicationId) {
    return await this.getRow(this.tables.applications, applicationId);
  }

  async getInternship(internshipId) {
    return await this.getRow(this.tables.internships, internshipId);
  }

  async getEnrollment(enrollmentId) {
    return await this.getRow(this.tables.enrollments, enrollmentId);
  }

  async getTask(taskId) {
    return await this.getRow(this.tables.tasks, taskId);
  }

  async getSubmission(submissionId) {
    return await this.getRow(this.tables.submissions, submissionId);
  }

  async getStudentProfileByAuthId(authUserId) {
    const res = await this.listRows(this.tables.studentProfiles, [
      Query.equal("authUserId", authUserId),
      Query.limit(1),
    ]);
    return res.rows[0] || null;
  }

  async getLatestApprovedReview(submissionId) {
    if (!this.tables.reviews) return null;
    const res = await this.listRows(this.tables.reviews, [
      Query.equal("submissionId", submissionId),
      Query.equal("decision", "approved"),
      Query.orderDesc("reviewedAt"),
      Query.limit(1),
    ]);
    return res.rows[0] || null;
  }

  async getMandatoryTasks(internshipId) {
    const res = await this.listRows(this.tables.tasks, [
      Query.equal("internshipId", internshipId),
      Query.equal("isMandatory", true),
      Query.limit(100),
    ]);
    return res.rows;
  }

  async getApprovedTaskSubmission(studentId, taskId) {
    const res = await this.listRows(this.tables.submissions, [
      Query.equal("studentId", studentId),
      Query.equal("taskId", taskId),
      Query.equal("status", "approved"),
      Query.limit(1),
    ]);
    return res.rows[0] || null;
  }

  async getPaymentRecord(studentId, enrollmentId) {
    if (!this.tables.payments) return null;
    const res = await this.listRows(this.tables.payments, [
      Query.equal("studentId", studentId),
      Query.equal("enrollmentId", enrollmentId),
      Query.limit(1),
    ]);
    return res.rows[0] || null;
  }

  async getSignatorySettings() {
    try {
      if (!this.tables.websiteContent) {
        return { name: "Yash Gautam", designation: "Founder", signatureFileId: null };
      }
      const res = await this.listRows(this.tables.websiteContent, [
        Query.equal("contentKey", "authorized-signatory"),
        Query.limit(1),
      ]);
      const row = res.rows[0];
      if (row && typeof row.content === "string") {
        const parsed = JSON.parse(row.content);
        return {
          name: parsed.name?.trim() || "Yash Gautam",
          designation: parsed.designation?.trim() || "Founder",
          signatureFileId: parsed.signatureFileId || null,
        };
      }
    } catch {
      // Fallback to default signatory
    }
    return { name: "Yash Gautam", designation: "Founder", signatureFileId: null };
  }

  async findDocumentByEventKey(eventKey) {
    const res = await this.listRows(this.tables.documents, [
      Query.equal("eventKey", eventKey),
      Query.limit(1),
    ]);
    return res.rows[0] || null;
  }

  async findDocumentById(documentId) {
    try {
      return await this.getRow(this.tables.documents, documentId);
    } catch {
      return null;
    }
  }

  async createDocumentRecord(documentId, data, permissions = []) {
    return await this.createRow(this.tables.documents, documentId, data, permissions);
  }

  async updateApplicationOfferStatus(applicationId, offerStatus = "sent") {
    try {
      return await this.updateRow(this.tables.applications, applicationId, {
        offerStatus,
        offerSentAt: new Date().toISOString(),
        offerSentBy: "system",
      });
    } catch (err) {
      console.warn(`[DatabaseService] Could not update application ${applicationId} offerStatus:`, err);
    }
  }

  async logAudit(actorId, action, resourceId, details = {}, resourceType = "document") {
    if (!this.tables.auditLogs) return;
    try {
      await this.createRow(this.tables.auditLogs, ID.unique(), {
        actorId: actorId || "system",
        action,
        resourceType,
        resourceId,
        details: JSON.stringify(details),
        ipHash: null,
        occurredAt: new Date().toISOString(),
      });
    } catch {
      // Non-blocking audit log
    }
  }

  async createNotification(userId, title, body, options = {}) {
    if (!this.tables.notifications) return;
    try {
      await this.createRow(this.tables.notifications, ID.unique(), {
        userId,
        eventKey: options.eventKey || `doc-notification:${ID.unique()}`,
        title,
        body,
        type: options.type || "document",
        targetUrl: options.targetUrl || "/account",
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Non-blocking notification
    }
  }
}
