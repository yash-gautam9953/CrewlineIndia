import { readFileSync } from "node:fs";
import { Client, ID, Query, TablesDB } from "node-appwrite";

function loadLocalEnv() {
  const file = readFileSync(".env.local", "utf8");
  for (const line of file.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const testPrograms = [
  {
    slug: "test-web-development-internship",
    title: "TEST — Web Development Internship",
    domain: "Web Development",
    duration: "4 weeks (test listing)",
    description: "TEST LISTING — This sample record is only for testing Crewline's application and admin offer-email flow. It is not an active job opening or a promise of placement.",
    eligibility: "For application-flow testing only. No real selection will take place from this listing.",
    learningOutcomes: "Practice a basic responsive web page, accessible navigation, and a simple client-side interaction.",
    tasks: "Task 1: Build a responsive landing page.\nTask 2: Add an accessible contact form layout.\nTask 3: Submit a short project summary.",
    evaluationCriteria: "Test rubric: responsive layout, accessibility basics, and clear project explanation.",
  },
  {
    slug: "test-python-programming-internship",
    title: "TEST — Python Programming Internship",
    domain: "Python Programming",
    duration: "4 weeks (test listing)",
    description: "TEST LISTING — This sample record is only for testing Crewline's application and admin offer-email flow. It is not an active job opening or a promise of placement.",
    eligibility: "For application-flow testing only. No real selection will take place from this listing.",
    learningOutcomes: "Practice Python fundamentals, input validation, and basic data handling.",
    tasks: "Task 1: Write a command-line data organiser.\nTask 2: Validate user input and handle errors.\nTask 3: Document how to run the project.",
    evaluationCriteria: "Test rubric: correct output, input validation, readable code, and clear documentation.",
  },
  {
    slug: "test-data-science-internship",
    title: "TEST — Data Science Internship",
    domain: "Data Science",
    duration: "4 weeks (test listing)",
    description: "TEST LISTING — This sample record is only for testing Crewline's application and admin offer-email flow. It is not an active job opening or a promise of placement.",
    eligibility: "For application-flow testing only. No real selection will take place from this listing.",
    learningOutcomes: "Practice cleaning a small dataset, summarising values, and explaining a chart.",
    tasks: "Task 1: Clean a small sample dataset.\nTask 2: Calculate summary statistics.\nTask 3: Present one chart with a short explanation.",
    evaluationCriteria: "Test rubric: data handling, accurate summaries, readable visualisation, and clear explanation.",
  },
];

async function main() {
  loadLocalEnv();
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const tableId = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  if (!endpoint || !projectId || !apiKey || !databaseId || !tableId) {
    throw new Error("Set Appwrite endpoint, project, API key, database, and internships table in .env.local first.");
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const tablesDB = new TablesDB(client);
  let created = 0;
  let alreadyPresent = 0;

  for (const program of testPrograms) {
    const existing = await tablesDB.listRows({
      databaseId,
      tableId,
      queries: [Query.equal("slug", program.slug), Query.limit(1)],
    });
    if (existing.rows.length > 0) {
      alreadyPresent++;
      console.log(`Already exists: ${program.title}`);
      continue;
    }

    await tablesDB.createRow({
      databaseId,
      tableId,
      rowId: ID.unique(),
      data: { ...program, publicationStatus: "published" },
    });
    created++;
    console.log(`Added: ${program.title} (${program.slug})`);
  }

  console.log(`Finished. Added ${created}; reused ${alreadyPresent}. These are TEST records only.`);
}

main().catch((error) => {
  const code = typeof error?.code === "number" ? ` (HTTP ${error.code})` : "";
  const type = typeof error?.type === "string" ? ` ${error.type}` : "";
  console.error(`Test internship seed failed${code}${type}: ${error?.message || "Unknown error"}`);
  process.exitCode = 1;
});
