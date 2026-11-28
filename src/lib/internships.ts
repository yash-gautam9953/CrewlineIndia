import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";

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

async function fetchPublishedInternships(limit: number): Promise<InternshipResult> {
  const service = createPrivilegedAppwriteClient();
  if (!service) return { status: "not-configured", internships: [] };

  try {
    const { tables } = await getAppwriteResources();
    const tableId = tables.internships;
    const response = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId,
      queries: [
        Query.equal("publicationStatus", "published"),
        Query.orderDesc("$createdAt"),
        Query.limit(Math.min(Math.max(limit, 1), 25)),
        Query.select(["$id", "title", "slug", "domain", "description", "duration", "eligibility", "applicationDeadline"]),
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

const getCachedPublishedInternships = unstable_cache(
  async (limit: number) => fetchPublishedInternships(limit),
  ["crewline-published-internships"],
  { revalidate: 60, tags: ["internships-catalog"] }
);

export const getPublishedInternships = cache(async (limit = 6): Promise<InternshipResult> => {
  try {
    const result = await getCachedPublishedInternships(limit);
    // Avoid serving a cached transient outage if Appwrite recovers
    if (result.status === "ready") return result;
  } catch {
    // Fallback outside Next.js runtime (e.g. standalone node tests)
  }
  return fetchPublishedInternships(limit);
});
