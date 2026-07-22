/**
 * Sliding-window rate limiter per tenant (in-memory; durable enough for process lifetime).
 */

type Bucket = { windowStart: number; count: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  tenantId: string,
  limitPerMinute: number,
  now = Date.now(),
): { allowed: boolean; remaining: number } {
  const windowMs = 60_000;
  let b = buckets.get(tenantId);
  if (!b || now - b.windowStart >= windowMs) {
    b = { windowStart: now, count: 0 };
    buckets.set(tenantId, b);
  }
  if (b.count >= limitPerMinute) {
    return { allowed: false, remaining: 0 };
  }
  b.count += 1;
  return { allowed: true, remaining: limitPerMinute - b.count };
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
