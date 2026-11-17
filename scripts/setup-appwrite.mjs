import { readFileSync, writeFileSync } from "node:fs";
import { Client, ID, Query, Storage, TablesDB } from "node-appwrite";

const envPath = ".env.local";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForColumn(tablesDB, databaseId, tableId, key, tableName) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const columns = (await tablesDB.listColumns({ databaseId, tableId, queries: [Query.limit(100)], total: true })).columns;
    const column = columns.find((item) => item.key === key);
    if (column?.status === "available") return column;
    if (column?.status === "failed") throw new Error(`Column ${tableName}.${key} failed to provision.`);
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for column ${tableName}.${key}. It may still be processing in Appwrite; rerun the setup command to continue safely.`);
}

function readEnv() {
  let source;
  try {
    source = readFileSync(envPath, "utf8");
  } catch {
    throw new Error(".env.local is missing. Copy .env.example to .env.local first.");
  }
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return { source, values };
}

function writeEnvValue(key, value) {
  const { source } = readEnv();
  const line = `${key}=${value}`;
  const expression = new RegExp(`^${key}=.*$`, "m");
  const updated = expression.test(source) ? source.replace(expression, line) : `${source.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, updated, "utf8");
}

const tableDefinitions = [
  { env: "APPWRITE_STUDENT_PROFILES_TABLE_ID", name: "Student profiles", columns: [
    ["authUserId", "varchar", true, 36], ["fullName", "varchar", true, 160], ["email", "varchar", true, 254], ["phone", "varchar", false, 32], ["college", "varchar", false, 180], ["course", "varchar", false, 160], ["currentYear", "integer", false], ["city", "varchar", false, 120], ["avatarFileId", "varchar", false, 36], ["profileStatus", "enum", true, ["active", "suspended"]],
  ], indexes: [["student_auth_user_unique", "unique", ["authUserId"]]] },
  { env: "APPWRITE_INTERNSHIPS_TABLE_ID", name: "Internships", columns: [
    ["title", "varchar", true, 180], ["slug", "varchar", true, 180], ["domain", "varchar", true, 80], ["description", "text", true], ["duration", "varchar", true, 80], ["eligibility", "text", false], ["learningOutcomes", "text", false], ["tasks", "text", false], ["evaluationCriteria", "text", false], ["applicationDeadline", "datetime", false], ["publicationStatus", "enum", true, ["draft", "published", "archived"]],
  ], indexes: [["internship_slug_unique", "unique", ["slug"]], ["internship_publication_status", "key", ["publicationStatus"]]] },
  { env: "APPWRITE_APPLICATIONS_TABLE_ID", name: "Applications", columns: [
    ["studentId", "varchar", true, 36], ["internshipId", "varchar", true, 36], ["domain", "varchar", false, 80], ["studentName", "varchar", false, 160], ["studentEmail", "varchar", false, 254], ["phone", "varchar", false, 32], ["college", "varchar", false, 180], ["course", "varchar", false, 160], ["currentYear", "integer", false], ["city", "varchar", false, 120], ["statement", "text", false], ["status", "enum", true, ["pending", "approved", "rejected", "withdrawn"]], ["reviewedBy", "varchar", false, 36], ["reviewedAt", "datetime", false], ["reviewNote", "text", false], ["offerStatus", "enum", true, ["not_prepared", "draft", "sent", "failed"]], ["offerStartDate", "datetime", false], ["offerDuration", "varchar", false, 80], ["offerMode", "enum", false, ["remote", "hybrid", "onsite"]], ["offerStipend", "varchar", false, 120], ["offerNotes", "text", false], ["whatsappLink", "varchar", false, 2048], ["googleFormLink", "varchar", false, 2048], ["offerSentAt", "datetime", false], ["offerSentBy", "varchar", false, 36], ["emailMessageId", "varchar", false, 36],
  ], indexes: [["application_student_program_unique", "unique", ["studentId", "internshipId"]], ["application_status", "key", ["status"]]] },
  { env: "APPWRITE_ENROLLMENTS_TABLE_ID", name: "Enrollments", columns: [
    ["studentId", "varchar", true, 36], ["internshipId", "varchar", true, 36], ["applicationId", "varchar", true, 36], ["status", "enum", true, ["active", "completed", "withdrawn", "suspended"]], ["startedAt", "datetime", false], ["completedAt", "datetime", false],
  ], indexes: [["enrollment_student_program_unique", "unique", ["studentId", "internshipId"]], ["enrollment_student", "key", ["studentId"]]] },
  { env: "APPWRITE_TASKS_TABLE_ID", name: "Internship tasks", columns: [
    ["internshipId", "varchar", true, 36], ["title", "varchar", true, 180], ["instructions", "text", true], ["sequence", "integer", true], ["isMandatory", "boolean", true], ["dueAt", "datetime", false], ["maxScore", "integer", false], ["isPublished", "boolean", true],
  ], indexes: [["task_program_sequence", "key", ["internshipId", "sequence"]]] },
  { env: "APPWRITE_SUBMISSIONS_TABLE_ID", name: "Task submissions", columns: [
    ["studentId", "varchar", true, 36], ["enrollmentId", "varchar", true, 36], ["taskId", "varchar", true, 36], ["version", "integer", true], ["repositoryUrl", "varchar", false, 2048], ["liveUrl", "varchar", false, 2048], ["explanation", "text", false], ["fileIds", "varchar", false, 4096], ["status", "enum", true, ["submitted", "under_review", "revision_required", "approved", "rejected"]], ["submittedAt", "datetime", false],
  ], indexes: [["submission_student_task_version", "unique", ["studentId", "taskId", "version"]], ["submission_status", "key", ["status"]]] },
  { env: "APPWRITE_REVIEWS_TABLE_ID", name: "Submission reviews", columns: [
    ["submissionId", "varchar", true, 36], ["reviewerId", "varchar", true, 36], ["feedback", "text", true], ["score", "integer", false], ["decision", "enum", true, ["under_review", "revision_required", "approved", "rejected"]], ["reviewedAt", "datetime", true],
  ], indexes: [["review_submission", "key", ["submissionId"]]] },
  { env: "APPWRITE_CERTIFICATES_TABLE_ID", name: "Certificates", columns: [
    ["certificateId", "varchar", true, 40], ["studentId", "varchar", true, 36], ["studentName", "varchar", true, 160], ["internshipId", "varchar", true, 36], ["internshipTitle", "varchar", true, 180], ["domain", "varchar", true, 80], ["duration", "varchar", true, 80], ["issueDate", "datetime", true], ["issuer", "varchar", true, 180], ["status", "enum", true, ["valid", "revoked"]], ["pdfFileId", "varchar", false, 36],
  ], indexes: [["certificate_public_id_unique", "unique", ["certificateId"]], ["certificate_student", "key", ["studentId"]]] },
  { env: "APPWRITE_CERTIFICATE_REVOCATIONS_TABLE_ID", name: "Certificate revocations", columns: [
    ["certificateId", "varchar", true, 40], ["revokedBy", "varchar", true, 36], ["reason", "text", true], ["revokedAt", "datetime", true],
  ], indexes: [["certificate_revocation_unique", "unique", ["certificateId"]]] },
  { env: "APPWRITE_DOCUMENTS_TABLE_ID", name: "Issued documents", columns: [
    ["documentType", "enum", true, ["offer", "internship_completion", "project_completion"]], ["eventKey", "varchar", true, 255], ["studentId", "varchar", true, 36], ["studentName", "varchar", true, 160], ["internshipId", "varchar", false, 36], ["sourceId", "varchar", false, 36], ["documentTitle", "varchar", true, 180], ["documentDomain", "varchar", false, 80], ["duration", "varchar", false, 80], ["issueDate", "datetime", true], ["status", "enum", true, ["valid", "revoked"]], ["storageFileId", "varchar", true, 36], ["snapshot", "text", true], ["signatoryName", "varchar", true, 160], ["signatoryDesignation", "varchar", true, 160], ["signatorySignatureFileId", "varchar", false, 36], ["templateVersion", "varchar", true, 32], ["issuedBy", "varchar", true, 36], ["revokedAt", "datetime", false], ["revocationReason", "text", false], ["reissuedFrom", "varchar", false, 40],
  ], indexes: [["document_event_unique", "unique", ["eventKey"]], ["document_student", "key", ["studentId"]], ["document_type_status", "key", ["documentType", "status"]]] },
  { env: "APPWRITE_NOTIFICATIONS_TABLE_ID", name: "Notifications", columns: [
    ["userId", "varchar", true, 36], ["title", "varchar", true, 180], ["body", "text", true], ["type", "varchar", true, 60], ["targetUrl", "varchar", false, 2048], ["isRead", "boolean", true], ["readAt", "datetime", false],
  ], indexes: [["notification_user_read", "key", ["userId", "isRead"]]] },
  { env: "APPWRITE_AUDIT_LOGS_TABLE_ID", name: "Audit logs", columns: [
    ["actorId", "varchar", false, 36], ["action", "varchar", true, 120], ["resourceType", "varchar", true, 80], ["resourceId", "varchar", false, 64], ["details", "text", false], ["ipHash", "varchar", false, 128], ["occurredAt", "datetime", true],
  ], indexes: [["audit_resource", "key", ["resourceType", "resourceId"]], ["audit_occurred_at", "key", ["occurredAt"]]] },
  { env: "APPWRITE_WEBSITE_CONTENT_TABLE_ID", name: "Website content", columns: [
    ["contentKey", "varchar", true, 180], ["contentType", "varchar", true, 80], ["content", "text", true], ["isPublished", "boolean", true], ["updatedBy", "varchar", false, 36], ["publishedAt", "datetime", false],
  ], indexes: [["website_content_key_unique", "unique", ["contentKey"]]] },
];

const bucketDefinitions = [
  { env: "APPWRITE_PROFILE_BUCKET_ID", name: "Profile images", extensions: ["jpg", "jpeg", "png", "webp"], maximumFileSize: 5 * 1024 * 1024 },
  { env: "APPWRITE_SUBMISSIONS_BUCKET_ID", name: "Student submissions", extensions: ["pdf", "zip", "png", "jpg", "jpeg", "txt"], maximumFileSize: 25 * 1024 * 1024 },
  { env: "APPWRITE_CERTIFICATES_BUCKET_ID", name: "Certificates", extensions: ["pdf"], maximumFileSize: 10 * 1024 * 1024 },
  { env: "APPWRITE_DOCUMENTS_BUCKET_ID", name: "Crewline documents and signatures", extensions: ["pdf", "png"], maximumFileSize: 10 * 1024 * 1024 },
];

function columnPayload(databaseId, tableId, [key, type, required, extra]) {
  const base = { databaseId, tableId, key, required };
  if (type === "varchar") return { method: "createVarcharColumn", params: { ...base, size: extra } };
  if (type === "text") return { method: "createTextColumn", params: base };
  if (type === "boolean") return { method: "createBooleanColumn", params: base };
  if (type === "integer") return { method: "createIntegerColumn", params: base };
  if (type === "datetime") return { method: "createDatetimeColumn", params: base };
  if (type === "enum") return { method: "createEnumColumn", params: { ...base, elements: extra } };
  throw new Error(`Unsupported column type ${type}`);
}

async function main() {
  const { values } = readEnv();
  const endpoint = values.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = values.APPWRITE_PROJECT_ID || values.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = values.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) throw new Error("Set NEXT_PUBLIC_APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY in .env.local. The API key is required only by this local setup command.");
  if (values.NEXT_PUBLIC_APPWRITE_PROJECT_ID && values.NEXT_PUBLIC_APPWRITE_PROJECT_ID !== projectId) throw new Error("APPWRITE_PROJECT_ID and NEXT_PUBLIC_APPWRITE_PROJECT_ID must refer to the same Appwrite project.");

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const tablesDB = new TablesDB(client);
  const storage = new Storage(client);
  const identity = ID.unique;

  const currentDbId = values.APPWRITE_DATABASE_ID;
  const databases = await tablesDB.list();
  let database = currentDbId ? databases.databases.find((item) => item.$id === currentDbId) : databases.databases.find((item) => item.name === "Crewline");
  if (currentDbId && !database) database = await tablesDB.get({ databaseId: currentDbId });
  if (!database) {
    database = await tablesDB.create({ databaseId: identity(), name: "Crewline", enabled: true, description: "Crewline internship and certificate platform" });
    console.log("Created database: Crewline");
  } else console.log("Reusing database: Crewline");
  writeEnvValue("APPWRITE_DATABASE_ID", database.$id);

  const tables = await tablesDB.listTables({ databaseId: database.$id, total: true });
  for (const definition of tableDefinitions) {
    const configuredId = readEnv().values[definition.env];
    let table = configuredId ? tables.tables.find((item) => item.$id === configuredId) : tables.tables.find((item) => item.name === definition.name);
    if (configuredId && !table) table = await tablesDB.getTable({ databaseId: database.$id, tableId: configuredId });
    if (!table) {
      table = await tablesDB.createTable({ databaseId: database.$id, tableId: identity(), name: definition.name, permissions: [], rowSecurity: true, enabled: true });
      console.log(`Created table: ${definition.name}`);
    } else console.log(`Reusing table: ${definition.name}`);
    writeEnvValue(definition.env, table.$id);

    let columns = (await tablesDB.listColumns({ databaseId: database.$id, tableId: table.$id, queries: [Query.limit(100)], total: true })).columns;
    for (const definitionColumn of definition.columns) {
      const [key, type] = definitionColumn;
      let existing = columns.find((column) => column.key === key);
      if (!existing) {
        const payload = columnPayload(database.$id, table.$id, definitionColumn);
        await tablesDB[payload.method](payload.params);
        console.log(`  Added column: ${key}`);
        existing = await waitForColumn(tablesDB, database.$id, table.$id, key, definition.name);
      } else if ((type === "enum" ? existing.type !== "string" : existing.type !== type) || existing.status === "failed") {
        throw new Error(`Existing column ${definition.name}.${key} is type '${existing.type}' (expected '${type}'); resolve this schema mismatch before rerunning.`);
      } else if (existing.status !== "available") {
        existing = await waitForColumn(tablesDB, database.$id, table.$id, key, definition.name);
      }
    }

    const indexes = (await tablesDB.listIndexes({ databaseId: database.$id, tableId: table.$id, total: true })).indexes;
    for (const [key, type, columnsForIndex] of definition.indexes) {
      if (indexes.some((index) => index.key === key)) continue;
      const readyColumns = (await tablesDB.listColumns({ databaseId: database.$id, tableId: table.$id, queries: [Query.limit(100)], total: true })).columns;
      if (columnsForIndex.some((columnKey) => !readyColumns.some((column) => column.key === columnKey && column.status === "available"))) throw new Error(`Cannot create index ${key}; one or more columns are not available.`);
      await tablesDB.createIndex({ databaseId: database.$id, tableId: table.$id, key, type, columns: columnsForIndex });
      console.log(`  Added index: ${key}`);
    }
  }

  const buckets = await storage.listBuckets({ total: true });
  for (const definition of bucketDefinitions) {
    const configuredId = readEnv().values[definition.env];
    let bucket = configuredId ? buckets.buckets.find((item) => item.$id === configuredId) : buckets.buckets.find((item) => item.name === definition.name);
    if (configuredId && !bucket) bucket = await storage.getBucket({ bucketId: configuredId });
    if (!bucket) {
      bucket = await storage.createBucket({ bucketId: identity(), name: definition.name, permissions: [], fileSecurity: true, enabled: true, maximumFileSize: definition.maximumFileSize, allowedFileExtensions: definition.extensions, encryption: true, antivirus: true, stripMetadata: true });
      console.log(`Created bucket: ${definition.name}`);
    } else console.log(`Reusing bucket: ${definition.name}`);
    writeEnvValue(definition.env, bucket.$id);
  }

  writeEnvValue("APPWRITE_PROJECT_ID", projectId);
  writeEnvValue("NEXT_PUBLIC_APPWRITE_PROJECT_ID", projectId);
  console.log("Appwrite setup finished. IDs were saved in .env.local; no sample rows were created.");
}

main().catch((error) => {
  const code = typeof error?.code === "number" ? ` (HTTP ${error.code})` : "";
  const type = typeof error?.type === "string" ? ` ${error.type}` : "";
  console.error(`Appwrite setup stopped${code}${type}: ${error?.message || "Unknown error"}`);
  console.error("No destructive operations are performed by this script. Review the error and fix configuration or schema issues before rerunning.");
  process.exitCode = 1;
});
