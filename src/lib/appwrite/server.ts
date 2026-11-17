import "server-only";
import { Client, TablesDB } from "node-appwrite";

export function createPrivilegedAppwriteClient() {
  const { endpoint, projectId, databaseId } = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.APPWRITE_PROJECT_ID,
    databaseId: process.env.APPWRITE_DATABASE_ID,
  };

  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !databaseId || !apiKey) return null;

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return { client, tablesDB: new TablesDB(client), databaseId };
}
