import { DocumentService } from "./services/document-service.js";
import { handleOfferLetter } from "./handlers/offer-letter.handler.js";
import { handleInternshipCertificate } from "./handlers/internship-certificate.handler.js";
import { handleProjectCertificate } from "./handlers/project-certificate.handler.js";
import { renderDocumentTemplate } from "./utils/template-renderer.js";

/**
 * Appwrite Function Entrypoint for Crewline Document Engine.
 *
 * Handles automated and on-demand issuance for:
 * 1. Internship Offer Letters (offer)
 * 2. Internship Completion Certificates (internship_completion)
 * 3. Project Completion Certificates (project_completion)
 *
 * @param {object} context
 * @param {object} context.req - Appwrite request object
 * @param {object} context.res - Appwrite response object
 * @param {Function} context.log - Logging function
 * @param {Function} context.error - Error logging function
 */
const documentGeneratorFunction = async ({ req, res, log, error }) => {
  // Use exclusively the ephemeral execution key injected by Appwrite per request
  const apiKey = req.headers?.["x-appwrite-key"] || "";
  const documentService = new DocumentService({ apiKey });

  // Safely parse request body
  let payload = {};
  try {
    if (req.bodyJson && typeof req.bodyJson === "object") {
      payload = req.bodyJson;
    } else if (typeof req.body === "object" && req.body !== null) {
      payload = req.body;
    } else if (typeof req.body === "string" && req.body.trim()) {
      payload = JSON.parse(req.body);
    }
  } catch (parseErr) {
    error(`[crewline-doc-engine] JSON parse failed: ${parseErr.message}`);
    return res.json({ success: false, error: "Malformed JSON payload" }, 400);
  }

  // Health check endpoint
  if (payload.action === "health" || req.path === "/health") {
    return res.json({
      status: "ok",
      service: "crewline-document-generator",
      timestamp: new Date().toISOString(),
    });
  }

  // HTML Preview mode (for admin preview without persistent storage)
  if (payload.action === "preview" && payload.documentType && payload.data) {
    try {
      const html = await renderDocumentTemplate({
        documentType: payload.documentType,
        data: payload.data,
        signatureDataUrl: payload.signatureDataUrl || null,
        qrCodeDataUrl: payload.qrCodeDataUrl || null,
      });
      return res.text(html, 200, { "Content-Type": "text/html; charset=utf-8" });
    } catch (previewErr) {
      error(`[crewline-doc-engine] Preview rendering error: ${previewErr.message}`);
      return res.json({ success: false, error: previewErr.message }, 400);
    }
  }

  const { documentType } = payload;
  if (!documentType) {
    return res.json(
      {
        success: false,
        error: "Missing required field 'documentType'. Expected: 'offer' | 'internship_completion' | 'project_completion'",
      },
      400
    );
  }

  log(`[crewline-doc-engine] Processing issuance request for documentType=${documentType}`);

  try {
    let result;
    switch (documentType) {
      case "offer":
        result = await handleOfferLetter(documentService, payload);
        break;
      case "internship_completion":
        result = await handleInternshipCertificate(documentService, payload);
        break;
      case "project_completion":
        result = await handleProjectCertificate(documentService, payload);
        break;
      default:
        return res.json(
          {
            success: false,
            error: `Unsupported documentType '${documentType}'. Expected: 'offer', 'internship_completion', 'project_completion'`,
          },
          400
        );
    }

    log(`[crewline-doc-engine] Successfully processed documentId=${result.documentId}`);
    return res.json({ success: true, ...result }, 200);
  } catch (err) {
    error(`[crewline-doc-engine] Issuance failed: ${err.message}`);
    return res.json(
      {
        success: false,
        error: err.message || "An unexpected error occurred during document generation.",
      },
      400
    );
  }
};

export default documentGeneratorFunction;

