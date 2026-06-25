/**
 * requirePublicApiContext helpers — pure functions (no Next.js imports).
 * The actual Next.js middleware lives in apps/web/src/lib/requirePublicApiContext.ts.
 */
import { getSaasApiKeysService } from "./SaasApiKeysService";

export interface PublicApiContext {
  tenantId: string;
  scopes: string[];
  keyId: string;
}

// ── In-memory rate limiter (per key, per minute) ─────────────────────────────

const _rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_MIN = 60;

export function checkPublicApiRateLimit(keyId: string, limitPerMin = RATE_LIMIT_PER_MIN): boolean {
  const now = Date.now();
  const bucket = _rateBuckets.get(keyId);
  if (!bucket || now >= bucket.resetAt) {
    _rateBuckets.set(keyId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  bucket.count++;
  return bucket.count <= limitPerMin;
}

export function getRateLimitRemaining(keyId: string, limitPerMin = RATE_LIMIT_PER_MIN): number {
  const bucket = _rateBuckets.get(keyId);
  if (!bucket || Date.now() >= bucket.resetAt) return limitPerMin;
  return Math.max(0, limitPerMin - bucket.count);
}

export function resetRateLimitForTests(): void { _rateBuckets.clear(); }

export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes("*") || scopes.includes(required);
}

export async function resolvePublicApiKey(rawKey: string): Promise<{ tenantId: string; scopes: string[] } | null> {
  return getSaasApiKeysService().verifyKey(rawKey);
}
