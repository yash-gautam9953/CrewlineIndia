/**
 * Handler for generating and issuing Crewline Internship Completion Certificates.
 */
export async function handleInternshipCertificate(documentService, payload = {}) {
  const { enrollmentId, issuedBy = "system", forceRegenerate = false } = payload;

  if (!enrollmentId) {
    throw new Error("Missing required parameter: enrollmentId");
  }

  const result = await documentService.issueDocument({
    documentType: "internship_completion",
    sourceId: enrollmentId,
    issuedBy,
    forceRegenerate,
  });

  return {
    documentType: "internship_completion",
    ...result,
  };
}
