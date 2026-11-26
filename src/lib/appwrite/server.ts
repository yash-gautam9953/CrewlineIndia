import "server-only";
import { Client, TablesDB } from "node-appwrite";
import { resolveAppwriteEndpoint, resolveAppwriteProjectId } from "./project";

export function createPrivilegedAppwriteClient() {
  const endpoint = resolveAppwriteEndpoint();
  const projectId = resolveAppwriteProjectId();
  const databaseId = process.env.APPWRITE_DATABASE_ID?.trim();
  const apiKey = process.env.APPWRITE_API_KEY?.trim();

  if (!endpoint || !projectId || !databaseId || !apiKey) return null;

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return { client, tablesDB: new TablesDB(client), databaseId, projectId };
}
