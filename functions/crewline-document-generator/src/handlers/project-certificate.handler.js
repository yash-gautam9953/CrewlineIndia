/**
 * Handler for generating and issuing Crewline Project Completion Certificates.
 */
export async function handleProjectCertificate(documentService, payload = {}) {
  const { submissionId, issuedBy = "system", forceRegenerate = false } = payload;

  if (!submissionId) {
    throw new Error("Missing required parameter: submissionId");
  }

  const result = await documentService.issueDocument({
    documentType: "project_completion",
    sourceId: submissionId,
    issuedBy,
    forceRegenerate,
  });

  return {
    documentType: "project_completion",
    ...result,
  };
}
