export const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  internshipsTableId: process.env.APPWRITE_INTERNSHIPS_TABLE_ID,
};

export function hasPublicInternshipConfig() {
  return Boolean(appwriteConfig.endpoint && appwriteConfig.projectId && appwriteConfig.databaseId && appwriteConfig.internshipsTableId);
}
