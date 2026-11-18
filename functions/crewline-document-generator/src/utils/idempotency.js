/**
 * Idempotency event key generation for Crewline documents.
 * Prevents race conditions and duplicate document issuance for identical events.
 */

/**
 * Computes deterministic eventKey for document uniqueness.
 * @param {"offer" | "internship_completion" | "project_completion"} type
 * @param {string} sourceId
 * @param {string} [reissueFromId=""]
 * @returns {string}
 */
export function getEventKey(type, sourceId, reissueFromId = "") {
  if (!type || !sourceId) {
    throw new Error("Both type and sourceId are required to construct an eventKey.");
  }
  const cleanType = String(type).trim();
  const cleanSourceId = String(sourceId).trim();
  const cleanReissue = reissueFromId ? String(reissueFromId).trim() : "";

  return cleanReissue
    ? `${cleanType}:${cleanSourceId}:reissue:${cleanReissue}`
    : `${cleanType}:${cleanSourceId}`;
}
