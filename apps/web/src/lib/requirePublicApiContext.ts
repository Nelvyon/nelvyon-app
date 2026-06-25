/**
 * Next.js middleware for /api/public/v1/* routes.
 */
import { NextResponse } from "next/server";
import {
  checkPublicApiRateLimit,
  getRateLimitRemaining,
  hasScope,
  resolvePublicApiKey,
} from "../../../../backend/saas/requirePublicApiContext";

export type { PublicApiContext } from "../../../../backend/saas/requirePublicApiContext";

const RATE_LIMIT_PER_MIN = 60;

export type PublicApiResult =
  | { ok: true; ctx: { tenantId: string; scopes: string[]; keyId: string }; rateHeaders: Record<string, string> }
  | { ok: false; response: NextResponse };

export async function requirePublicApiContext(req: Request, requiredScope: string): Promise<PublicApiResult> {
  const authHeader = req.headers.get("authorization") ?? "";
  const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!rawKey) {
    return { ok: false, response: NextResponse.json({ error: "Missing Authorization header" }, { status: 401 }) };
  }

  const verified = await resolvePublicApiKey(rawKey);
  if (!verified) {
    return { ok: false, response: NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 }) };
  }

  const { tenantId, scopes } = verified;
  const keyId = rawKey.slice(0, 20);

  const allowed   = checkPublicApiRateLimit(keyId);
  const remaining = getRateLimitRemaining(keyId);
  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Limit":     String(RATE_LIMIT_PER_MIN),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset":     String(Math.ceil((Date.now() + 60_000) / 1000)),
  };

  if (!allowed) {
    return { ok: false, response: NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: rateHeaders }) };
  }

  if (!hasScope(scopes, requiredScope)) {
    return {
      ok: false,
      response: NextResponse.json({ error: `Insufficient scope. Required: ${requiredScope}` }, { status: 403, headers: rateHeaders }),
    };
  }

  return { ok: true, ctx: { tenantId, scopes, keyId }, rateHeaders };
}
