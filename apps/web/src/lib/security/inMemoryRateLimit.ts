/** Per-process fixed-window limiter — fallback when Upstash is unavailable. */
const buckets = new Map<string, { count: number; resetAt: number }>();

const MAX_BUCKETS = 20_000;

function pruneExpired(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS * 0.8) break;
  }
}

export function checkInMemoryRateLimit(params: {
  key: string;
  limit: number;
  windowSec: number;
}): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  pruneExpired(now);
  const entry = buckets.get(params.key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(params.key, { count: 1, resetAt: now + params.windowSec * 1000 });
    return { allowed: true, retryAfter: params.windowSec };
  }
  entry.count += 1;
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > params.limit) {
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter };
}

/** Test-only reset */
export function resetInMemoryRateLimitForTests(): void {
  buckets.clear();
}
