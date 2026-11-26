import "server-only";
import { ExecutionMethod, Functions } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";

export function isDocumentFunctionConfigured() {
  return Boolean(process.env.APPWRITE_DOCUMENT_FUNCTION_ID?.trim());
}

export async function invokeDocumentFunction<T extends Record<string, unknown>>(
  payload: Record<string, unknown>,
  timeoutMs = 45_000
): Promise<T> {
  const functionId = process.env.APPWRITE_DOCUMENT_FUNCTION_ID?.trim();
  const service = createPrivilegedAppwriteClient();
  if (!functionId || !service) {
    throw new Error("Appwrite document function is not configured.");
  }

  const functions = new Functions(service.client);
  const executionPromise = functions.createExecution({
    functionId,
    body: JSON.stringify(payload),
    async: false,
    method: ExecutionMethod.POST,
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Document generation function timed out.")), timeoutMs)
  );

  const execution = await Promise.race([executionPromise, timeoutPromise]);
  if (execution.status !== "completed" || execution.responseStatusCode >= 400) {
    let errorMessage = "Document generation function failed.";
    try {
      const parsed = JSON.parse(execution.responseBody || "{}") as { error?: string };
      if (parsed.error) errorMessage = parsed.error;
    } catch {
      if (execution.errors) errorMessage = execution.errors;
    }
    throw new Error(errorMessage);
  }

  const parsed = JSON.parse(execution.responseBody || "{}") as T & { success?: boolean; error?: string };
  if (parsed.success === false) {
    throw new Error(parsed.error || "Document generation function returned an error.");
  }
  return parsed;
}
