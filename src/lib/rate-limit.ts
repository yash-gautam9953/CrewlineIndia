import "server-only";
import { createHash } from "node:crypto";

type Entry = { startedAt: number; count: number };
const windows = new Map<string, Entry>();
const WINDOW_MS = 60_000;
const WINDOW_SECONDS = 60;

function clientDigest(request: Request, action: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")?.trim()
    ?? "unknown";
  const digest = createHash("sha256").update(forwarded).digest("hex").slice(0, 24);
  return `rl:${action}:${digest}`;
}

export type RateLimitResult = {
  limited: boolean;
  unavailable?: boolean;
  mode: "distributed" | "memory" | "unavailable";
};

/**
 * Distributed rate limiter using Upstash Redis REST when configured.
 * In production (NODE_ENV === "production"), fails closed if Upstash is unavailable
 * or unconfigured (unless CREWLINE_ALLOW_MEMORY_RATE_LIMIT=true is explicitly set).
 * In local development/test, falls back to per-process memory window.
 */
export async function checkRateLimit(
  request: Request,
  action: string,
  limit: number
): Promise<RateLimitResult> {
  const key = clientDigest(request, action);
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const isProd = process.env.NODE_ENV === "production";
  const allowMemoryInProd = process.env.CREWLINE_ALLOW_MEMORY_RATE_LIMIT === "true";

  if (redisUrl && redisToken) {
    try {
      const response = await fetch(`${redisUrl.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, WINDOW_SECONDS, "NX"],
        ]),
        cache: "no-store",
      });
      if (response.ok) {
        const results = (await response.json()) as Array<{ result?: number }>;
        const count = Number(results?.[0]?.result ?? 1);
        return { limited: count > limit, mode: "distributed" };
      }
      if (isProd && !allowMemoryInProd) {
        return { limited: true, unavailable: true, mode: "unavailable" };
      }
    } catch {
      if (isProd && !allowMemoryInProd) {
        return { limited: true, unavailable: true, mode: "unavailable" };
      }
      return { limited: isRateLimited(request, action, limit), mode: "memory" };
    }
  }

  if (isProd && !allowMemoryInProd) {
    return { limited: true, unavailable: true, mode: "unavailable" };
  }

  return { limited: isRateLimited(request, action, limit), mode: "memory" };
}

/** Best-effort per-process limiter for local development/testing. */
export function isRateLimited(request: Request, action: string, limit: number) {
  const key = clientDigest(request, action);
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    windows.set(key, { startedAt: now, count: 1 });
    if (windows.size > 5000) {
      for (const [entryKey, entry] of windows) if (now - entry.startedAt >= WINDOW_MS) windows.delete(entryKey);
    }
    return false;
  }
  current.count += 1;
  return current.count > limit;
}
