/**
 * HTML Escaping & Formatting Utilities for Crewline Document Engine.
 * Strictly prevents XSS / HTML injection in rendered certificates and offer letters.
 */

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes characters with special meaning in HTML.
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Escapes HTML and defaults empty strings to an em-dash.
 * @param {string | null | undefined} value
 * @param {string} [fallback="—"]
 * @returns {string}
 */
export function safeText(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str ? escapeHtml(str) : fallback;
}

/**
 * Formats an ISO date string or Date object into human-readable Indian English date (e.g., "18 November 2026").
 * @param {string | Date | null | undefined} value
 * @returns {string}
 */
export function dateText(value) {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return safeText(String(value));
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return safeText(String(value));
  }
}
