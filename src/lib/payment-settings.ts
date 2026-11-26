import "server-only";
import { ID, Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";

export type PaymentSettings = {
  configured: boolean;
  googleFormUrl: string;
  feeAmount: number | null;
  instructions: string;
};

const CONTENT_KEY = "payment-settings";

export async function readPaymentSettings(): Promise<PaymentSettings> {
  const service = createPrivilegedAppwriteClient();
  if (!service) {
    return { configured: false, googleFormUrl: "", feeAmount: null, instructions: "" };
  }
  try {
    const { tables } = await getAppwriteResources();
    const tableId = tables.websiteContent;
    const result = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId,
      queries: [Query.equal("contentKey", CONTENT_KEY), Query.limit(1)],
    });
    const row = result.rows[0] as (typeof result.rows)[number] & Record<string, unknown> | undefined;
    if (!row || typeof row.content !== "string") {
      return { configured: false, googleFormUrl: "", feeAmount: null, instructions: "" };
    }
    const parsed = JSON.parse(row.content) as {
      googleFormUrl?: unknown;
      feeAmount?: unknown;
      instructions?: unknown;
    };
    const googleFormUrl = typeof parsed.googleFormUrl === "string" ? parsed.googleFormUrl.trim() : "";
    const feeAmount = typeof parsed.feeAmount === "number" && parsed.feeAmount > 0 ? parsed.feeAmount : null;
    const instructions = typeof parsed.instructions === "string" ? parsed.instructions.trim() : "";
    return {
      configured: Boolean(googleFormUrl),
      googleFormUrl,
      feeAmount,
      instructions,
    };
  } catch {
    return { configured: false, googleFormUrl: "", feeAmount: null, instructions: "" };
  }
}

export async function savePaymentSettings(
  adminId: string,
  settings: { googleFormUrl: string; feeAmount: number | null; instructions: string }
) {
  const service = createPrivilegedAppwriteClient();
  if (!service) {
    throw new Error("Payment settings storage is not configured.");
  }
  const { tables } = await getAppwriteResources();
  const tableId = tables.websiteContent;

  const existing = await service.tablesDB.listRows({
    databaseId: service.databaseId,
    tableId,
    queries: [Query.equal("contentKey", CONTENT_KEY), Query.limit(1)],
  });

  const content = JSON.stringify({
    googleFormUrl: settings.googleFormUrl,
    feeAmount: settings.feeAmount,
    instructions: settings.instructions,
    updatedAt: new Date().toISOString(),
  });

  if (existing.rows[0]) {
    await service.tablesDB.updateRow({
      databaseId: service.databaseId,
      tableId,
      rowId: existing.rows[0].$id,
      data: {
        content,
        contentType: CONTENT_KEY,
        isPublished: true,
        updatedBy: adminId,
      },
    });
  } else {
    await service.tablesDB.createRow({
      databaseId: service.databaseId,
      tableId,
      rowId: ID.unique(),
      data: {
        contentKey: CONTENT_KEY,
        contentType: CONTENT_KEY,
        content,
        isPublished: true,
        updatedBy: adminId,
        publishedAt: new Date().toISOString(),
      },
    });
  }
}
