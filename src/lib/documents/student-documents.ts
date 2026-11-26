import "server-only";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import type { DocumentType } from "./document-id-generator";

export async function getStudentDocuments(userId: string) {
  const service = createPrivilegedAppwriteClient();
  if (!service) return [];
  const { tables } = await getAppwriteResources();
  const tableId = tables.documents;
  const result = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("studentId", userId), Query.orderDesc("issueDate"), Query.limit(100)] });
  return result.rows.map((row) => {
    const data = row as typeof row & Record<string, unknown>;
    return { id: row.$id, type: String(data.documentType) as DocumentType, title: String(data.documentTitle ?? "Crewline document"), issueDate: String(data.issueDate ?? ""), status: String(data.status ?? "unavailable"), reissuedFrom: typeof data.reissuedFrom === "string" ? data.reissuedFrom : "" };
  });
}
