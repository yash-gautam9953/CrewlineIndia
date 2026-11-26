import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { resolveAppwriteEndpoint, resolveAppwriteProjectId } from "../src/lib/appwrite/project";
import {
  AppwriteResourceError,
  BUCKET_DEFINITIONS,
  discoverAppwriteResources,
  TABLE_DEFINITIONS,
  type ResourceDiscoveryClient,
} from "../src/lib/appwrite/resources";
import { CORE_REQUIRED_ENV, checkRequiredEnv } from "../src/lib/env";
import { generatePdf } from "../src/lib/documents/pdf-generator";
import { checkRateLimit } from "../src/lib/rate-limit";

function buildTablesFixture(databaseId = "db_main") {
  return Object.entries(TABLE_DEFINITIONS).map(([key, def], idx) => ({
    $id: `tbl_${key}_${idx + 1}`,
    name: def.name,
    databaseId,
  }));
}

function buildBucketsFixture() {
  return Object.entries(BUCKET_DEFINITIONS).map(([key, def], idx) => ({
    $id: `bkt_${key}_${idx + 1}`,
    name: def.name,
  }));
}

function createMockClient(options?: {
  projectId?: string;
  databaseId?: string;
  tables?: Array<{ $id: string; name: string; databaseId?: string }>;
  buckets?: Array<{ $id: string; name: string }>;
  databaseGetError?: boolean;
  env?: Record<string, string | undefined>;
}): ResourceDiscoveryClient {
  const projectId = options?.projectId ?? "proj_staging";
  const databaseId = options?.databaseId ?? "db_staging";
  return {
    endpoint: "https://cloud.appwrite.io/v1",
    projectId,
    databaseId,
    env: options?.env ?? {},
    tablesDB: {
      async get({ databaseId: reqDb }) {
        if (options?.databaseGetError || reqDb !== databaseId) {
          throw new Error("Database not found");
        }
        return { $id: databaseId, name: "Crewline DB" };
      },
      async listTables() {
        return { tables: options?.tables ?? buildTablesFixture(databaseId) };
      },
    },
    storage: {
      async listBuckets() {
        return { buckets: options?.buckets ?? buildBucketsFixture() };
      },
    },
  };
}

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

test("all 14 tables and 2 buckets resolve automatically by exact name", async () => {
  const resolved = await discoverAppwriteResources(createMockClient());
  assert.equal(resolved.projectId, "proj_staging");
  assert.equal(resolved.databaseId, "db_staging");
  assert.equal(Object.keys(resolved.tables).length, 14);
  assert.equal(Object.keys(resolved.buckets).length, 2);
  assert.equal(resolved.tables.enrollments, "tbl_enrollments_4");
  assert.equal(resolved.tables.documents, "tbl_documents_12");
  assert.equal(resolved.buckets.submissionsBucket, "bkt_submissionsBucket_1");
  assert.equal(resolved.buckets.documentsBucket, "bkt_documentsBucket_2");
});

test("missing required table fails closed with MISSING_RESOURCE", async () => {
  const partialTables = buildTablesFixture("db_staging").filter((t) => t.name !== "Enrollments");
  await assert.rejects(
    () => discoverAppwriteResources(createMockClient({ tables: partialTables })),
    (err: unknown) => err instanceof AppwriteResourceError && err.code === "MISSING_RESOURCE"
  );
});

test("missing required bucket fails closed with MISSING_RESOURCE", async () => {
  const partialBuckets = buildBucketsFixture().filter((b) => b.name !== "Crewline documents and signatures");
  await assert.rejects(
    () => discoverAppwriteResources(createMockClient({ buckets: partialBuckets })),
    (err: unknown) => err instanceof AppwriteResourceError && err.code === "MISSING_RESOURCE"
  );
});

test("duplicate table or bucket names fail closed with AMBIGUOUS_RESOURCE", async () => {
  const dupTables = [
    ...buildTablesFixture("db_staging"),
    { $id: "tbl_dup", name: "Internships", databaseId: "db_staging" },
  ];
  await assert.rejects(
    () => discoverAppwriteResources(createMockClient({ tables: dupTables })),
    (err: unknown) => err instanceof AppwriteResourceError && err.code === "AMBIGUOUS_RESOURCE"
  );

  const dupBuckets = [
    ...buildBucketsFixture(),
    { $id: "bkt_dup", name: "Student submissions" },
  ];
  await assert.rejects(
    () => discoverAppwriteResources(createMockClient({ buckets: dupBuckets })),
    (err: unknown) => err instanceof AppwriteResourceError && err.code === "AMBIGUOUS_RESOURCE"
  );
});

test("explicit table and bucket overrides work when belonging to configured project and database", async () => {
  const tables = [
    ...buildTablesFixture("db_staging"),
    { $id: "custom_enrollments_v2", name: "Enrollments legacy clone", databaseId: "db_staging" },
  ];
  const buckets = [
    ...buildBucketsFixture(),
    { $id: "custom_docs_bucket_v2", name: "Archive docs bucket" },
  ];

  const resolved = await discoverAppwriteResources(
    createMockClient({
      tables,
      buckets,
      env: {
        APPWRITE_ENROLLMENTS_TABLE_ID: "custom_enrollments_v2",
        APPWRITE_DOCUMENTS_BUCKET_ID: "custom_docs_bucket_v2",
      },
    })
  );

  assert.equal(resolved.tables.enrollments, "custom_enrollments_v2");
  assert.equal(resolved.buckets.documentsBucket, "custom_docs_bucket_v2");
});

test("staging environment rejects production IDs and cross-database overrides", async () => {
  // Foreign/production table ID not present in staging database
  await assert.rejects(
    () =>
      discoverAppwriteResources(
        createMockClient({
          projectId: "proj_staging",
          databaseId: "db_staging",
          env: { APPWRITE_INTERNSHIPS_TABLE_ID: "prod_6afc2186001b2e3f593d" },
        })
      ),
    (err: unknown) => err instanceof AppwriteResourceError && err.code === "ASSOCIATION_MISMATCH"
  );

  // Table entry claiming another databaseId
  const tablesWithCrossDb = [
    ...buildTablesFixture("db_staging").filter((t) => t.name !== "Internships"),
    { $id: "tbl_foreign_db", name: "Internships", databaseId: "db_production" },
  ];
  await assert.rejects(
    () =>
      discoverAppwriteResources(
        createMockClient({
          databaseId: "db_staging",
          tables: tablesWithCrossDb,
          env: { APPWRITE_INTERNSHIPS_TABLE_ID: "tbl_foreign_db" },
        })
      ),
    (err: unknown) => err instanceof AppwriteResourceError && err.code === "ASSOCIATION_MISMATCH"
  );

  // Foreign bucket ID not present in staging project
  await assert.rejects(
    () =>
      discoverAppwriteResources(
        createMockClient({
          env: { APPWRITE_DOCUMENTS_BUCKET_ID: "prod_6afcb719002354770876" },
        })
      ),
    (err: unknown) => err instanceof AppwriteResourceError && err.code === "ASSOCIATION_MISMATCH"
  );

  // Unreachable database in configured project
  await assert.rejects(
    () => discoverAppwriteResources(createMockClient({ databaseGetError: true })),
    (err: unknown) => err instanceof AppwriteResourceError && err.code === "ASSOCIATION_MISMATCH"
  );
});

test("project ID consolidation and 7-core-env validation", () => {
  assert.equal(resolveAppwriteEndpoint({ NEXT_PUBLIC_APPWRITE_ENDPOINT: " https://cloud.appwrite.io/v1 " }), "https://cloud.appwrite.io/v1");
  assert.equal(resolveAppwriteProjectId({ NEXT_PUBLIC_APPWRITE_PROJECT_ID: "proj_123" }), "proj_123");
  assert.equal(resolveAppwriteProjectId({ APPWRITE_PROJECT_ID: "proj_legacy" }), "proj_legacy");
  assert.equal(
    resolveAppwriteProjectId({ NEXT_PUBLIC_APPWRITE_PROJECT_ID: "proj_same", APPWRITE_PROJECT_ID: "proj_same" }),
    "proj_same"
  );
  assert.throws(
    () => resolveAppwriteProjectId({ NEXT_PUBLIC_APPWRITE_PROJECT_ID: "proj_a", APPWRITE_PROJECT_ID: "proj_b" }),
    /mismatch/i
  );

  const validEnv = {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://cloud.appwrite.io/v1",
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: "proj_123",
    NEXT_PUBLIC_APP_URL: "https://crewline.me",
    APPWRITE_API_KEY: "secret-key",
    APPWRITE_DATABASE_ID: "db_123",
    CREWLINE_ADMIN_IDENTITIES: "admin_1",
    CREWLINE_PREVIEW_SECRET: "preview_secret",
  };
  const okResult = checkRequiredEnv(CORE_REQUIRED_ENV, validEnv);
  assert.equal(okResult.ok, true);
  assert.deepEqual(okResult.missing, []);

  const mismatchResult = checkRequiredEnv(CORE_REQUIRED_ENV, { ...validEnv, APPWRITE_PROJECT_ID: "other_proj" });
  assert.equal(mismatchResult.ok, false);
  assert.match(mismatchResult.mismatchError ?? "", /mismatch/i);
});

test("production mode enforces Appwrite Document Function and fails closed on missing Upstash rate limiting", async () => {
  const prevEnv = {
    NODE_ENV: process.env.NODE_ENV,
    APPWRITE_DOCUMENT_FUNCTION_ID: process.env.APPWRITE_DOCUMENT_FUNCTION_ID,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    CREWLINE_ALLOW_MEMORY_RATE_LIMIT: process.env.CREWLINE_ALLOW_MEMORY_RATE_LIMIT,
  };

  try {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.APPWRITE_DOCUMENT_FUNCTION_ID;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.CREWLINE_ALLOW_MEMORY_RATE_LIMIT;

    await assert.rejects(
      () => generatePdf("<html><body>Test</body></html>", false),
      /APPWRITE_DOCUMENT_FUNCTION_ID is required/i
    );

    const rl = await checkRateLimit(new Request("https://crewline.me/api/applications"), "test-action", 5);
    assert.equal(rl.limited, true);
    assert.equal(rl.unavailable, true);
    assert.equal(rl.mode, "unavailable");
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv.NODE_ENV;
    if (prevEnv.APPWRITE_DOCUMENT_FUNCTION_ID !== undefined) process.env.APPWRITE_DOCUMENT_FUNCTION_ID = prevEnv.APPWRITE_DOCUMENT_FUNCTION_ID;
    else delete process.env.APPWRITE_DOCUMENT_FUNCTION_ID;
    if (prevEnv.UPSTASH_REDIS_REST_URL !== undefined) process.env.UPSTASH_REDIS_REST_URL = prevEnv.UPSTASH_REDIS_REST_URL;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (prevEnv.UPSTASH_REDIS_REST_TOKEN !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = prevEnv.UPSTASH_REDIS_REST_TOKEN;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
    if (prevEnv.CREWLINE_ALLOW_MEMORY_RATE_LIMIT !== undefined) process.env.CREWLINE_ALLOW_MEMORY_RATE_LIMIT = prevEnv.CREWLINE_ALLOW_MEMORY_RATE_LIMIT;
    else delete process.env.CREWLINE_ALLOW_MEMORY_RATE_LIMIT;
  }
});

test("client components and browser code never import server-only resolver or read private secrets/IDs", () => {
  const srcFiles = collectTsFiles(join(process.cwd(), "src"));
  for (const file of srcFiles) {
    const content = readFileSync(file, "utf8");
    const isClient = content.startsWith('"use client"') || content.startsWith("'use client'");
    if (isClient) {
      assert.doesNotMatch(content, /@\/lib\/appwrite\/resources/);
      assert.doesNotMatch(content, /@\/lib\/appwrite\/server/);
      assert.doesNotMatch(content, /APPWRITE_API_KEY/);
      assert.doesNotMatch(content, /APPWRITE_[A-Z0-9_]+_(TABLE|BUCKET)_ID/);
    }
    // Outside resources.ts itself, no source file should read table/bucket ID env vars directly
    if (!file.endsWith(join("src", "lib", "appwrite", "resources.ts"))) {
      assert.doesNotMatch(content, /process\.env\.APPWRITE_[A-Z0-9_]+_(TABLE|BUCKET)_ID/, `Unexpected direct env read in ${file}`);
    }
  }
});
