import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ID, Query } from "node-appwrite";
import { z } from "zod";
import { getAdminUser } from "@/lib/authz";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { isRateLimited } from "@/lib/rate-limit";

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(160, "Name must be at most 160 characters."),
  designation: z.string().trim().min(2, "Designation must be at least 2 characters.").max(160, "Designation must be at most 160 characters."),
});

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Signatory storage is not configured." }, { status: 503 });
  const tableId = resources.tables.websiteContent;
  try {
    const result = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("contentKey", "authorized-signatory"), Query.limit(1)] });
    const row = result.rows[0] as (typeof result.rows)[number] & Record<string, unknown> | undefined;
    if (!row || typeof row.content !== "string") return NextResponse.json({ configured: false, name: "", designation: "" });
    const settings = JSON.parse(row.content) as { name?: string; designation?: string };
    const configured = Boolean(settings.name?.trim() && settings.designation?.trim());
    return NextResponse.json({
      configured,
      name: settings.name?.trim() ?? "",
      designation: settings.designation?.trim() ?? "",
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Signatory settings are unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (isRateLimited(request, "signatory-settings", 10)) return NextResponse.json({ error: "Too many settings changes. Wait before trying again." }, { status: 429 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  let rawName = "";
  let rawDesignation = "";

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      rawName = typeof body.name === "string" ? body.name : "";
      rawDesignation = typeof body.designation === "string" ? body.designation : "";
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
  } else {
    try {
      const form = await request.formData();
      rawName = String(form.get("name") ?? "");
      rawDesignation = String(form.get("designation") ?? "");
    } catch {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }
  }

  const parsed = detailsSchema.safeParse({ name: rawName, designation: rawDesignation });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Enter a valid signatory name and designation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Signatory storage is not configured." }, { status: 503 });
  const tableId = resources.tables.websiteContent;

  let stage = "read-signatory-settings";
  try {
    const existing = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId, queries: [Query.equal("contentKey", "authorized-signatory"), Query.limit(1)] });
    const content = JSON.stringify({
      name: parsed.data.name,
      designation: parsed.data.designation,
      updatedAt: new Date().toISOString(),
    });

    if (existing.rows[0]) {
      stage = "update-signatory-settings";
      await service.tablesDB.updateRow({
        databaseId: service.databaseId,
        tableId,
        rowId: existing.rows[0].$id,
        data: { content, contentType: "authorized-signatory", isPublished: false, updatedBy: admin.$id },
      });
    } else {
      stage = "create-signatory-settings";
      await service.tablesDB.createRow({
        databaseId: service.databaseId,
        tableId,
        rowId: ID.unique(),
        data: { contentKey: "authorized-signatory", contentType: "authorized-signatory", content, isPublished: false, updatedBy: admin.$id, publishedAt: null },
      });
    }
    try { revalidateTag("signatory-settings", { expire: 0 }); } catch { /* ignore outside Next runtime */ }
    return NextResponse.json({ saved: true, name: parsed.data.name, designation: parsed.data.designation }, { status: 200 });
  } catch (error) {
    const failure = (typeof error === "object" && error !== null ? error : {}) as { code?: unknown; type?: unknown };
    const code = typeof failure.code === "number" ? failure.code : undefined;
    const type = typeof failure.type === "string" ? failure.type : undefined;
    console.error("[documents/signatory] Appwrite request failed", { stage, code, type });
    if (type === "general_unauthorized_scope") {
      return NextResponse.json({ error: "Appwrite API key is missing rows.read / rows.write. Add the scope to APPWRITE_API_KEY and restart the dev server." }, { status: 503 });
    }
    return NextResponse.json({ error: `Could not save authorized signatory settings during ${stage.replaceAll("-", " ")}${code ? ` (Appwrite HTTP ${code}${type ? `, ${type}` : ""})` : ". Check the Appwrite error shown in the dev terminal."}` }, { status: 502 });
  }
}
