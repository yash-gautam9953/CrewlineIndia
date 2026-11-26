import "server-only";
import { Client, Query, Storage, TablesDB } from "node-appwrite";
import { resolveAppwriteEndpoint, resolveAppwriteProjectId } from "./project";

export const TABLE_DEFINITIONS = {
  studentProfiles: { env: "APPWRITE_STUDENT_PROFILES_TABLE_ID", name: "Student profiles" },
  internships: { env: "APPWRITE_INTERNSHIPS_TABLE_ID", name: "Internships" },
  applications: { env: "APPWRITE_APPLICATIONS_TABLE_ID", name: "Applications" },
  enrollments: { env: "APPWRITE_ENROLLMENTS_TABLE_ID", name: "Enrollments" },
  tasks: { env: "APPWRITE_TASKS_TABLE_ID", name: "Internship tasks" },
  taskAssignments: { env: "APPWRITE_TASK_ASSIGNMENTS_TABLE_ID", name: "Task assignments" },
  taskResources: { env: "APPWRITE_TASK_RESOURCES_TABLE_ID", name: "Task resource versions" },
  submissions: { env: "APPWRITE_SUBMISSIONS_TABLE_ID", name: "Task submissions" },
  reviews: { env: "APPWRITE_REVIEWS_TABLE_ID", name: "Submission reviews" },
  payments: { env: "APPWRITE_PAYMENTS_TABLE_ID", name: "Payment verification" },
  certificates: { env: "APPWRITE_CERTIFICATES_TABLE_ID", name: "Certificates" },
  documents: { env: "APPWRITE_DOCUMENTS_TABLE_ID", name: "Issued documents" },
  auditLogs: { env: "APPWRITE_AUDIT_LOGS_TABLE_ID", name: "Audit logs" },
  websiteContent: { env: "APPWRITE_WEBSITE_CONTENT_TABLE_ID", name: "Website content" },
} as const;

export const BUCKET_DEFINITIONS = {
  submissionsBucket: { env: "APPWRITE_SUBMISSIONS_BUCKET_ID", name: "Student submissions" },
  documentsBucket: { env: "APPWRITE_DOCUMENTS_BUCKET_ID", name: "Crewline documents and signatures" },
} as const;

export type TableKey = keyof typeof TABLE_DEFINITIONS;
export type BucketKey = keyof typeof BUCKET_DEFINITIONS;

export type ResolvedResources = {
  projectId: string;
  databaseId: string;
  tables: Record<TableKey, string>;
  buckets: Record<BucketKey, string>;
};

export class AppwriteResourceError extends Error {
  code: "NOT_CONFIGURED" | "MISSING_RESOURCE" | "AMBIGUOUS_RESOURCE" | "ASSOCIATION_MISMATCH";

  constructor(
    code: "NOT_CONFIGURED" | "MISSING_RESOURCE" | "AMBIGUOUS_RESOURCE" | "ASSOCIATION_MISMATCH",
    message: string
  ) {
    super(message);
    this.name = "AppwriteResourceError";
    this.code = code;
  }
}

type TableRow = { $id: string; name: string; databaseId?: string };
type BucketRow = { $id: string; name: string };

export type ResourceDiscoveryClient = {
  tablesDB: {
    get: (params: { databaseId: string }) => Promise<{ $id: string; name: string }>;
    listTables: (params: { databaseId: string; queries?: string[]; total?: boolean }) => Promise<{ tables: TableRow[] }>;
  };
  storage: {
    listBuckets: (params: { queries?: string[]; total?: boolean }) => Promise<{ buckets: BucketRow[] }>;
  };
  endpoint: string;
  projectId: string;
  databaseId: string;
  env?: Record<string, string | undefined>;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const resourceCache = new Map<string, { resolvedAt: number; data: ResolvedResources }>();
const inFlightCache = new Map<string, Promise<ResolvedResources>>();

export function invalidateAppwriteResourceCache() {
  resourceCache.clear();
  inFlightCache.clear();
}

export async function discoverAppwriteResources(client: ResourceDiscoveryClient): Promise<ResolvedResources> {
  const { tablesDB, storage, projectId, databaseId } = client;
  const env = client.env ?? process.env;

  if (!projectId || !databaseId) {
    throw new AppwriteResourceError("NOT_CONFIGURED", "Appwrite project ID and database ID are required.");
  }

  // Validate that the configured database actually exists in the configured Appwrite project
  let database: { $id: string; name: string };
  try {
    database = await tablesDB.get({ databaseId });
  } catch {
    throw new AppwriteResourceError(
      "ASSOCIATION_MISMATCH",
      `Database '${databaseId}' could not be accessed in Appwrite project '${projectId}'.`
    );
  }
  if (!database || database.$id !== databaseId) {
    throw new AppwriteResourceError(
      "ASSOCIATION_MISMATCH",
      `Database '${databaseId}' does not match the configured Appwrite project.`
    );
  }

  const [tablesResult, bucketsResult] = await Promise.all([
    tablesDB.listTables({ databaseId, queries: [Query.limit(100)], total: true }),
    storage.listBuckets({ queries: [Query.limit(100)], total: true }),
  ]);

  const tablesList = tablesResult.tables ?? [];
  const bucketsList = bucketsResult.buckets ?? [];

  const resolvedTables = {} as Record<TableKey, string>;
  for (const [key, def] of Object.entries(TABLE_DEFINITIONS) as [TableKey, { env: string; name: string }][]) {
    const override = env[def.env]?.trim();
    if (override) {
      const match = tablesList.find((t) => t.$id === override);
      if (!match) {
        throw new AppwriteResourceError(
          "ASSOCIATION_MISMATCH",
          `Configured ${def.env} ('${override}') does not belong to database '${databaseId}' in project '${projectId}'.`
        );
      }
      if (match.databaseId && match.databaseId !== databaseId) {
        throw new AppwriteResourceError(
          "ASSOCIATION_MISMATCH",
          `Table '${override}' belongs to another database.`
        );
      }
      resolvedTables[key] = match.$id;
      continue;
    }

    const matches = tablesList.filter((t) => t.name === def.name);
    if (matches.length === 0) {
      throw new AppwriteResourceError(
        "MISSING_RESOURCE",
        `Required Appwrite table "${def.name}" was not found in database '${databaseId}'.`
      );
    }
    if (matches.length > 1) {
      throw new AppwriteResourceError(
        "AMBIGUOUS_RESOURCE",
        `Ambiguous Appwrite table "${def.name}": found ${matches.length} tables with the same exact name in database '${databaseId}'.`
      );
    }
    resolvedTables[key] = matches[0].$id;
  }

  const resolvedBuckets = {} as Record<BucketKey, string>;
  for (const [key, def] of Object.entries(BUCKET_DEFINITIONS) as [BucketKey, { env: string; name: string }][]) {
    const override = env[def.env]?.trim();
    if (override) {
      const match = bucketsList.find((b) => b.$id === override);
      if (!match) {
        throw new AppwriteResourceError(
          "ASSOCIATION_MISMATCH",
          `Configured ${def.env} ('${override}') does not belong to Appwrite project '${projectId}'.`
        );
      }
      resolvedBuckets[key] = match.$id;
      continue;
    }

    const matches = bucketsList.filter((b) => b.name === def.name);
    if (matches.length === 0) {
      throw new AppwriteResourceError(
        "MISSING_RESOURCE",
        `Required Appwrite storage bucket "${def.name}" was not found in project '${projectId}'.`
      );
    }
    if (matches.length > 1) {
      throw new AppwriteResourceError(
        "AMBIGUOUS_RESOURCE",
        `Ambiguous Appwrite storage bucket "${def.name}": found ${matches.length} buckets with the same exact name in project '${projectId}'.`
      );
    }
    resolvedBuckets[key] = matches[0].$id;
  }

  return {
    projectId,
    databaseId,
    tables: resolvedTables,
    buckets: resolvedBuckets,
  };
}

export async function getAppwriteResources(options: { refresh?: boolean } = {}): Promise<ResolvedResources> {
  const endpoint = resolveAppwriteEndpoint();
  const projectId = resolveAppwriteProjectId();
  const databaseId = process.env.APPWRITE_DATABASE_ID?.trim() || "";
  const apiKey = process.env.APPWRITE_API_KEY?.trim() || "";

  if (!endpoint || !projectId || !databaseId || !apiKey) {
    throw new AppwriteResourceError(
      "NOT_CONFIGURED",
      "Core Appwrite configuration is incomplete (NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY)."
    );
  }

  const cacheKey = `${endpoint}|${projectId}|${databaseId}`;
  const now = Date.now();
  if (!options.refresh) {
    const cached = resourceCache.get(cacheKey);
    if (cached && now - cached.resolvedAt < CACHE_TTL_MS) {
      return cached.data;
    }
    const existingPromise = inFlightCache.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const tablesDB = new TablesDB(client);
  const storage = new Storage(client);

  const promise = discoverAppwriteResources({
    tablesDB,
    storage,
    endpoint,
    projectId,
    databaseId,
    env: process.env,
  })
    .then((data) => {
      resourceCache.set(cacheKey, { resolvedAt: Date.now(), data });
      inFlightCache.delete(cacheKey);
      return data;
    })
    .catch((err) => {
      inFlightCache.delete(cacheKey);
      throw err;
    });

  inFlightCache.set(cacheKey, promise);
  return promise;
}

export async function requireTableId(key: TableKey): Promise<string> {
  const resources = await getAppwriteResources();
  return resources.tables[key];
}

export async function requireBucketId(key: BucketKey): Promise<string> {
  const resources = await getAppwriteResources();
  return resources.buckets[key];
}
