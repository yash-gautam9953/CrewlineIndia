/**
 * Environment configuration for Crewline Document Generator Appwrite Function.
 */
export function getEnv() {
  return {
    endpoint: process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1",
    projectId: process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "",
    apiKey: process.env.APPWRITE_API_KEY || "",
    databaseId: process.env.APPWRITE_DATABASE_ID || "6afc21760027a1281dc5",
    tables: {
      documents: process.env.APPWRITE_DOCUMENTS_TABLE_ID || "6afcb70600266a154ccd",
      studentProfiles: process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID || "6afc2178000e5d985790",
      internships: process.env.APPWRITE_INTERNSHIPS_TABLE_ID || "6afc2186001b2e3f593d",
      applications: process.env.APPWRITE_APPLICATIONS_TABLE_ID || "6afc2199001faac393fd",
      enrollments: process.env.APPWRITE_ENROLLMENTS_TABLE_ID || "6afc21a60026710fa615",
      tasks: process.env.APPWRITE_TASKS_TABLE_ID || "6afc21b200121c312377",
      taskAssignments: process.env.APPWRITE_TASK_ASSIGNMENTS_TABLE_ID || "6afdf82300255a2755a5",
      submissions: process.env.APPWRITE_SUBMISSIONS_TABLE_ID || "6afc21c0002d9d294d7f",
      reviews: process.env.APPWRITE_REVIEWS_TABLE_ID || "6afc21d20027248fd0e0",
      payments: process.env.APPWRITE_PAYMENTS_TABLE_ID || "6afdf848003cb1c56980",
      websiteContent: process.env.APPWRITE_WEBSITE_CONTENT_TABLE_ID || "6afc2211002c10b638d4",
      auditLogs: process.env.APPWRITE_AUDIT_LOGS_TABLE_ID || "6afc22030034f37f36ae",
      notifications: process.env.APPWRITE_NOTIFICATIONS_TABLE_ID || "6afc21f7003a79368098",
    },
    buckets: {
      documents: process.env.APPWRITE_DOCUMENTS_BUCKET_ID || "6afcb719002354770876",
      submissions: process.env.APPWRITE_SUBMISSIONS_BUCKET_ID || "6afc221c003e1cd31108",
      certificates: process.env.APPWRITE_CERTIFICATES_BUCKET_ID || "6afc221d00392ba8bef3",
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://crewline.me",
  };
}
