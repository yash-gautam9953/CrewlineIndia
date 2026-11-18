import { Client, Storage, ID, Permission, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { getEnv } from "../config/env.js";

/**
 * Storage Service for managing document files in Appwrite Storage.
 */
export class StorageService {
  constructor(customConfig = null) {
    const env = getEnv();
    this.endpoint = customConfig?.endpoint || env.endpoint;
    this.projectId = customConfig?.projectId || env.projectId;
    this.apiKey = customConfig?.apiKey || env.apiKey;
    this.bucketId = customConfig?.bucketId || env.buckets.documents;

    if (this.endpoint && this.projectId && this.apiKey) {
      this.client = new Client()
        .setEndpoint(this.endpoint)
        .setProject(this.projectId)
        .setKey(this.apiKey);
      this.storage = new Storage(this.client);
    } else {
      this.client = null;
      this.storage = null;
    }
  }

  isConfigured() {
    return Boolean(this.client && this.storage && this.bucketId);
  }

  ensureConfigured() {
    if (!this.isConfigured()) {
      throw new Error("Appwrite Storage service is not configured with required credentials or bucket ID.");
    }
  }

  /**
   * Uploads a generated PDF file to the documents bucket with student read permissions.
   * @param {Buffer} pdfBuffer
   * @param {string} fileName
   * @param {string} studentId
   * @returns {Promise<object>} Uploaded file object
   */
  async uploadDocumentPdf(pdfBuffer, fileName, studentId) {
    this.ensureConfigured();
    const fileId = ID.unique();
    const permissions = studentId ? [Permission.read(Role.user(studentId))] : [];

    return await this.storage.createFile({
      bucketId: this.bucketId,
      fileId,
      file: InputFile.fromBuffer(pdfBuffer, fileName),
      permissions,
    });
  }

  /**
   * Deletes a file from the documents bucket (used for rollback / orphan cleanup).
   * @param {string} fileId
   * @returns {Promise<void>}
   */
  async deleteFile(fileId) {
    if (!this.isConfigured() || !fileId) return;
    try {
      await this.storage.deleteFile({
        bucketId: this.bucketId,
        fileId,
      });
    } catch {
      // Best-effort cleanup
    }
  }

  /**
   * Downloads a signatory custom signature file from storage and returns a Data URL.
   * @param {string} fileId
   * @param {string} [bucketId]
   * @returns {Promise<string | null>}
   */
  async getSignatureDataUrl(fileId, bucketId = null) {
    if (!this.isConfigured() || !fileId) return null;
    try {
      const activeBucket = bucketId || this.bucketId;
      const fileBytes = await this.storage.getFileDownload({
        bucketId: activeBucket,
        fileId,
      });
      const base64 = Buffer.from(fileBytes).toString("base64");
      return `data:image/png;base64,${base64}`;
    } catch {
      return null;
    }
  }
}
