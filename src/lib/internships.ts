import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { appwriteConfig } from "@/lib/appwrite/config";

export type Internship = {
  id: string;
  title: string;
  slug: string;
  domain: string;
  summary: string;
  duration: string;
  eligibility: string;
  applicationDeadline?: string;
};

export type InternshipResult =
  | { status: "ready"; internships: Internship[] }
  | { status: "not-configured"; internships: [] }
  | { status: "unavailable"; internships: [] };

export async function getPublishedInternships(limit = 6): Promise<InternshipResult> {
  const service = createPrivilegedAppwriteClient();
  const tableId = appwriteConfig.internshipsTableId;
  if (!service || !tableId) return { status: "not-configured", internships: [] };

  try {
    const response = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId,
      queries: [
        Query.equal("publicationStatus", "published"),
        Query.orderDesc("$createdAt"),
        Query.limit(Math.min(Math.max(limit, 1), 25)),
      ],
    });

    const internships = response.rows.flatMap((row) => {
      const data = row as typeof row & Record<string, unknown>;
      if (typeof data.title !== "string" || typeof data.slug !== "string" || typeof data.domain !== "string") return [];
      // Seed records are intentionally retained in Appwrite for local testing,
      // but must never be presented as genuine opportunities to students.
      if (/^test(?:\b|[-_])/i.test(data.title.trim()) || /^test(?:\b|[-_])/i.test(data.slug.trim())) return [];
      return [{
        id: row.$id,
        title: data.title,
        slug: data.slug,
        domain: data.domain,
        summary: typeof data.description === "string" ? data.description : "",
        duration: typeof data.duration === "string" ? data.duration : "",
        eligibility: typeof data.eligibility === "string" ? data.eligibility : "",
        applicationDeadline: typeof data.applicationDeadline === "string" ? data.applicationDeadline : undefined,
      }];
    });

    return { status: "ready", internships };
  } catch {
    return { status: "unavailable", internships: [] };
  }
}
