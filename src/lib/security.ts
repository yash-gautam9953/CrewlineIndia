import "server-only";

/**
 * Validates that mutating requests originate from a trusted application origin.
 * Allows requests with matching Origin header, or matching Referer when Origin is absent.
 * Rejects cross-origin browser requests to prevent CSRF on form/JSON endpoints.
 */
export function isTrustedOrigin(request: Request): boolean {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const allowedOrigins = new Set<string>();

  if (configuredAppUrl) {
    try {
      allowedOrigins.add(new URL(configuredAppUrl).origin);
    } catch {
      // Ignore malformed configured URL
    }
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  if (host) {
    allowedOrigins.add(`${proto}://${host}`);
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return allowedOrigins.has(origin);
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return allowedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // In non-browser server-to-server calls (no Origin and no Referer), allow only if no Sec-Fetch-Site cross-site signal
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return false;
  }

  return true;
}
