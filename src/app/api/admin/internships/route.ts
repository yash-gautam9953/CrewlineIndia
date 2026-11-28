import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ID } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";

const schema = z.object({
  title: z.string().trim().min(3).max(180),
  domain: z.enum(["Web Development", "Python Development", "Java Development", "AI/ML", "Data Science", "UI/UX Design", "Cybersecurity", "Cloud Computing"]),
  duration: z.string().trim().min(1).max(80),
  description: z.string().trim().min(10).max(12000),
  eligibility: z.string().trim().max(4000).optional().default(""),
  learningOutcomes: z.string().trim().max(4000).optional().default(""),
  applicationDeadline: z.string().optional().default(""),
  publicationStatus: z.enum(["draft", "published"]),
});

function makeSlug(title: string) {
  return title.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Complete the required internship details." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Internship table is not configured." }, { status: 503 });
  const tableId = resources.tables.internships;

  try {
    const row = await service.tablesDB.createRow({
      databaseId: service.databaseId,
      tableId,
      rowId: ID.unique(),
      data: {
        title: input.data.title,
        slug: makeSlug(input.data.title),
        domain: input.data.domain,
        duration: input.data.duration,
        description: input.data.description,
        eligibility: input.data.eligibility,
        learningOutcomes: input.data.learningOutcomes,
        tasks: "",
        evaluationCriteria: "",
        applicationDeadline: input.data.applicationDeadline ? new Date(`${input.data.applicationDeadline}T23:59:59.000Z`).toISOString() : null,
        publicationStatus: input.data.publicationStatus,
      },
    });
    try { revalidateTag("internships-catalog", { expire: 0 }); } catch { /* ignore outside Next runtime */ }
    return NextResponse.json({ id: row.$id }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    return NextResponse.json({ error: code === 409 ? "An internship with this title/URL already exists. Try a more specific title." : "Could not save the internship." }, { status: code === 409 ? 409 : 500 });
  }
}
