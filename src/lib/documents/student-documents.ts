import "server-only";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import type { DocumentType } from "./document-id-generator";

export async function getStudentDocuments(userId: string) {
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_DOCUMENTS_TABLE_ID;
  if (!service || !tableId) return [];
  const result = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("studentId", userId), Query.orderDesc("issueDate"), Query.limit(100)] });
  return result.rows.map((row) => {
    const data = row as typeof row & Record<string, unknown>;
    return { id: row.$id, type: String(data.documentType) as DocumentType, title: String(data.documentTitle ?? "Crewline document"), issueDate: String(data.issueDate ?? ""), status: String(data.status ?? "unavailable"), reissuedFrom: typeof data.reissuedFrom === "string" ? data.reissuedFrom : "" };
  });
}
