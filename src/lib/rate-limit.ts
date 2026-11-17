import "server-only";
import { createHash } from "node:crypto";

type Entry = { startedAt: number; count: number };
const windows = new Map<string, Entry>();
const WINDOW_MS = 60_000;

/** Best-effort per-process limiter. Use an edge/shared store before horizontal production scaling. */
export function isRateLimited(request: Request, action: string, limit: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const digest = createHash("sha256").update(forwarded).digest("hex").slice(0, 24);
  const key = `${action}:${digest}`;
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
