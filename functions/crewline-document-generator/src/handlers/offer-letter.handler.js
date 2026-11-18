/**
 * Handler for generating and issuing Crewline Internship Offer Letters.
 */
export async function handleOfferLetter(documentService, payload = {}) {
  const { applicationId, issuedBy = "system", offerDetails, forceRegenerate = false } = payload;

  if (!applicationId) {
    throw new Error("Missing required parameter: applicationId");
  }

  const result = await documentService.issueDocument({
    documentType: "offer",
    sourceId: applicationId,
    issuedBy,
    options: { offerDetails },
    forceRegenerate,
  });

  return {
    documentType: "offer",
    ...result,
  };
}
