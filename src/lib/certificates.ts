import "server-only";
import { Query } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export type PublicCertificateResult =
  | { status: "valid"; certificate: { certificateId: string; certificateType: string; studentName: string; internshipTitle: string; duration: string; issueDate: string; issuer: string } }
  | { status: "revoked" }
  | { status: "not-found" }
  | { status: "unavailable" };

export async function verifyPublicCertificate(certificateId: string): Promise<PublicCertificateResult> {
  const service = createPrivilegedAppwriteClient();
  const tableId = process.env.APPWRITE_CERTIFICATES_TABLE_ID;
  if (!service || !tableId) return { status: "unavailable" };

  try {
    const documentsTable = process.env.APPWRITE_DOCUMENTS_TABLE_ID;
    if (documentsTable) {
      try {
        const issued = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: documentsTable, rowId: certificateId }) as Record<string, unknown>;
        if (issued.documentType === "offer") return { status: "not-found" };
        if (issued.status === "revoked") return { status: "revoked" };
        if (issued.status !== "valid" || typeof issued.studentName !== "string" || typeof issued.documentTitle !== "string" || typeof issued.issueDate !== "string") return { status: "unavailable" };
        return { status: "valid", certificate: {
          certificateId: certificateId,
          certificateType: issued.documentType === "project_completion" ? "Project completion certificate" : "Internship completion certificate",
          studentName: issued.studentName,
          internshipTitle: issued.documentTitle,
          duration: typeof issued.duration === "string" ? issued.duration : "",
          issueDate: issued.issueDate,
          issuer: "Crewline",
        } };
      } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
        if (code !== 404) return { status: "unavailable" };
      }
    }
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
      certificateType: "Internship completion certificate",
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
