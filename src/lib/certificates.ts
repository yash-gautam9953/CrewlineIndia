import "server-only";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export type PublicCertificateResult =
  | { status: "valid"; certificate: { certificateId: string; studentName: string; internshipTitle: string; duration: string; issueDate: string; issuer: string } }
  | { status: "revoked" }
  | { status: "not-found" }
  | { status: "unavailable" };

export async function verifyPublicCertificate(certificateId: string): Promise<PublicCertificateResult> {
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_CERTIFICATES_TABLE_ID;
  if (!service || !tableId) return { status: "unavailable" };

  try {
    const matches = await service.tablesDB.listRows({
      databaseId: service.databaseId,
      tableId,
      queries: [
        Query.equal("certificateId", certificateId),
        Query.limit(1),
        Query.select(["certificateId", "studentName", "internshipTitle", "duration", "issueDate", "issuer", "status"]),
      ],
    });
    const row = matches.rows[0] as (typeof matches.rows)[number] & Record<string, unknown> | undefined;
    if (!row || typeof row.certificateId !== "string") return { status: "not-found" };

    const revocationsTableId = process.env.APPWRITE_CERTIFICATE_REVOCATIONS_TABLE_ID;
    if (row.status === "revoked") return { status: "revoked" };
    if (revocationsTableId) {
      const revocations = await service.tablesDB.listRows({
        databaseId: service.databaseId,
        tableId: revocationsTableId,
        queries: [Query.equal("certificateId", certificateId), Query.limit(1), Query.select(["certificateId"])],
      });
      if (revocations.total > 0) return { status: "revoked" };
    }

    if ([row.studentName, row.internshipTitle, row.duration, row.issueDate, row.issuer].some((value) => typeof value !== "string")) return { status: "unavailable" };
    return { status: "valid", certificate: {
      certificateId: row.certificateId,
      studentName: row.studentName as string,
      internshipTitle: row.internshipTitle as string,
      duration: row.duration as string,
      issueDate: row.issueDate as string,
      issuer: row.issuer as string,
    } };
  } catch {
    return { status: "unavailable" };
  }
}
