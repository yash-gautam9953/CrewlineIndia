import { readFileSync } from "node:fs";
import { Client, ID, Query, TablesDB } from "node-appwrite";

function loadLocalEnv() {
  const file = readFileSync(".env.local", "utf8");
  for (const line of file.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

// Starter listings are published to let the real student application flow be
// tested. `legacySlug` migrates records created by the earlier TEST-only seed.
const starterPrograms = [
  {
    slug: "web-development-internship",
    legacySlug: "test-web-development-internship",
    title: "Web Development Internship",
    domain: "Web Development",
    duration: "1–3 months (selected on application)",
    description: "Build practical web development skills through guided tasks and a project submission. Applications are reviewed by Crewline before the next steps are shared.",
    eligibility: "Students interested in HTML, CSS, JavaScript, and building responsive web interfaces.",
    learningOutcomes: "Practice a responsive web page, accessible navigation, and a simple client-side interaction.",
    tasks: "Task 1: Build a responsive landing page.\nTask 2: Add an accessible contact form layout.\nTask 3: Submit a short project summary.",
    evaluationCriteria: "Responsive layout, accessibility basics, and a clear project explanation.",
  },
  {
    slug: "python-programming-internship",
    legacySlug: "test-python-programming-internship",
    title: "Python Development Internship",
    domain: "Python Development",
    duration: "1–3 months (selected on application)",
    description: "Practice Python fundamentals through structured tasks, error handling, and a documented project submission.",
    eligibility: "Students interested in Python programming and problem solving.",
    learningOutcomes: "Practice Python fundamentals, input validation, and basic data handling.",
    tasks: "Task 1: Write a command-line data organiser.\nTask 2: Validate user input and handle errors.\nTask 3: Document how to run the project.",
    evaluationCriteria: "Correct output, input validation, readable code, and clear documentation.",
  },
  {
    slug: "data-science-internship",
    legacySlug: "test-data-science-internship",
    title: "Data Science Internship",
    domain: "Data Science",
    duration: "1–3 months (selected on application)",
    description: "Learn the essentials of data preparation, exploratory analysis, and communicating findings through a project.",
    eligibility: "Students interested in working with data, analysis, and visualisation.",
    learningOutcomes: "Practice cleaning a small dataset, summarising values, and explaining a chart.",
    tasks: "Task 1: Clean a small sample dataset.\nTask 2: Calculate summary statistics.\nTask 3: Present one chart with a short explanation.",
    evaluationCriteria: "Data handling, accurate summaries, readable visualisation, and a clear explanation.",
  },
  {
    slug: "java-development-internship",
    legacySlug: "test-java-development-internship",
    title: "Java Development Internship",
    domain: "Java Development",
    duration: "1–3 months (selected on application)",
    description: "Build Java programming experience through guided practice tasks and a reviewed project submission.",
    eligibility: "Students interested in Java, object-oriented programming, and application development.",
    learningOutcomes: "Practice Java syntax, object-oriented design, collections, and basic testing.",
    tasks: "Task 1: Build a small Java command-line application.\nTask 2: Add input validation and tests.\nTask 3: Document the project and submit the source repository.",
    evaluationCriteria: "Correctness, readable structure, tests, and project documentation.",
  },
  {
    slug: "ai-ml-internship",
    legacySlug: "test-ai-ml-internship",
    title: "AI/ML Internship",
    domain: "AI/ML",
    duration: "1–3 months (selected on application)",
    description: "Explore AI and machine learning fundamentals through practical exercises and a documented project.",
    eligibility: "Students interested in programming, data, and responsible AI/ML experimentation.",
    learningOutcomes: "Practice preparing a small dataset, evaluating a model, and documenting its limitations.",
    tasks: "Task 1: Prepare a small sample dataset.\nTask 2: Run a guided model experiment.\nTask 3: Report evaluation results and limitations.",
    evaluationCriteria: "Data preparation, reproducible steps, evaluation quality, and responsible interpretation.",
  },
  {
    slug: "ui-ux-design-internship",
    legacySlug: "test-ui-ux-design-internship",
    title: "UI/UX Design Internship",
    domain: "UI/UX Design",
    duration: "1–3 months (selected on application)",
    description: "Practice user research, interface design, prototyping, and design handoff through guided tasks.",
    eligibility: "Students interested in user-centred design, interface systems, and accessible experiences.",
    learningOutcomes: "Practice a user flow, wireframes, a high-fidelity prototype, and accessibility review.",
    tasks: "Task 1: Map a user flow.\nTask 2: Create wireframes and a prototype.\nTask 3: Document design decisions and accessibility checks.",
    evaluationCriteria: "Clarity of user flow, consistency, accessibility, and design rationale.",
  },
  {
    slug: "cybersecurity-internship",
    legacySlug: "test-cybersecurity-internship",
    title: "Cybersecurity Internship",
    domain: "Cybersecurity",
    duration: "1–3 months (selected on application)",
    description: "Learn security fundamentals through safe, permission-based labs and a documented assessment.",
    eligibility: "Students interested in security fundamentals, responsible testing, and risk analysis.",
    learningOutcomes: "Practice threat modelling, safe lab assessment, and clear remediation reporting.",
    tasks: "Task 1: Review a deliberately vulnerable local lab.\nTask 2: Document findings and risk.\nTask 3: Propose and verify safe remediations.",
    evaluationCriteria: "Responsible scope, accurate findings, risk prioritisation, and remediation quality.",
  },
  {
    slug: "cloud-computing-internship",
    legacySlug: "test-cloud-computing-internship",
    title: "Cloud Computing Internship",
    domain: "Cloud Computing",
    duration: "1–3 months (selected on application)",
    description: "Practice cloud architecture basics, deployment workflows, and operational documentation.",
    eligibility: "Students interested in cloud platforms, networking, automation, and reliable deployments.",
    learningOutcomes: "Practice architecture diagrams, sandbox deployment, and monitoring basics.",
    tasks: "Task 1: Design a small cloud architecture.\nTask 2: Deploy a sample application in a sandbox.\nTask 3: Document operations and cost assumptions.",
    evaluationCriteria: "Architecture clarity, safe configuration, repeatable deployment, and operational notes.",
  },
];

async function findBySlug(tablesDB, databaseId, tableId, slug) {
  const result = await tablesDB.listRows({ databaseId, tableId, queries: [Query.equal("slug", slug), Query.limit(1)] });
  return result.rows[0] ?? null;
}

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

  const tablesDB = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
  let created = 0;
  let updated = 0;

  for (const { legacySlug, ...program } of starterPrograms) {
    const current = await findBySlug(tablesDB, databaseId, tableId, program.slug);
    const legacy = current ? null : await findBySlug(tablesDB, databaseId, tableId, legacySlug);
    const data = { ...program, publicationStatus: "published" };

    if (current || legacy) {
      await tablesDB.updateRow({ databaseId, tableId, rowId: (current ?? legacy).$id, data });
      updated++;
      console.log(`Updated: ${program.title} (${program.slug})`);
    } else {
      await tablesDB.createRow({ databaseId, tableId, rowId: ID.unique(), data });
      created++;
      console.log(`Added: ${program.title} (${program.slug})`);
    }
  }

  console.log(`Finished. Added ${created}; updated ${updated}. Published internships are visible on the public site.`);
}

main().catch((error) => {
  const code = typeof error?.code === "number" ? ` (HTTP ${error.code})` : "";
  const type = typeof error?.type === "string" ? ` ${error.type}` : "";
  console.error(`Internship seed failed${code}${type}: ${error?.message || "Unknown error"}`);
  process.exitCode = 1;
});
