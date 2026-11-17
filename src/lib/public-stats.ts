import "server-only";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export type PublicStats = {
  students: number | null;
  applications: number | null;
  certificates: number | null;
};

async function countRows(tableId: string | undefined, filters: string[] = []): Promise<number | null> {
  const service = createPrivilegedAppwriteClient();
  if (!service || !tableId) return null;
  try {
    const result = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId,
      queries: [...filters, Query.limit(1)],
    });
    return result.total;
  } catch {
    return null;
  }
}

export async function getPublicStats(): Promise<PublicStats | null> {
  const [students, applications, certificates] = await Promise.all([
    countRows(process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID),
    countRows(process.env.APPWRITE_APPLICATIONS_TABLE_ID),
    countRows(process.env.APPWRITE_CERTIFICATES_TABLE_ID),
  ]);

  if (students === null && applications === null && certificates === null) return null;
  return { students, applications, certificates };
}
