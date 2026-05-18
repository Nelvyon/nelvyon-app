import type { NextApiRequest, NextApiResponse } from "next";

import { NextResponse } from "next/server";

import { saasPublicApiService } from "../../../../../../../backend/saas/SaasPublicApiService";
import { logPublicApiAuthResult } from "../../../../../../../backend/saas/SaasPublicApiService";

export type PublicApiAuth = {
  apiKeyId: string;
  userId: string;
  rateLimitPerHour: number;
};

export async function authenticateApiKey(req: NextApiRequest, res: NextApiResponse): Promise<PublicApiAuth | null> {
  const auth = req.headers.authorization;
  const rawKey = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const config = rawKey ? await saasPublicApiService.validateApiKey(rawKey) : null;

  if (!config) {
    logPublicApiAuthResult(false);
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const allowed = await saasPublicApiService.checkRateLimit(config.id, config.rateLimitPerHour);
  const remaining = await saasPublicApiService.getRateLimitRemaining(config.id, config.rateLimitPerHour);
  res.setHeader("X-RateLimit-Limit", String(config.rateLimitPerHour));
  res.setHeader("X-RateLimit-Remaining", String(remaining));

  if (!allowed) {
    logPublicApiAuthResult(false, config.id);
    res.status(429).json({ error: "Rate limit exceeded" });
    return null;
  }

  logPublicApiAuthResult(true, config.id);
  return { apiKeyId: config.id, userId: config.userId, rateLimitPerHour: config.rateLimitPerHour };
}

/** Autenticación API key para rutas `app/api` (NextResponse). */
export async function authenticateApiKeyAppRouter(req: Request): Promise<
  | { ok: true; auth: PublicApiAuth; rateHeaders: Record<string, string> }
  | { ok: false; response: NextResponse; apiKeyIdForLog?: string }
> {
  const authHeader = req.headers.get("authorization");
  const rawKey =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const config = rawKey ? await saasPublicApiService.validateApiKey(rawKey) : null;

  if (!config) {
    logPublicApiAuthResult(false);
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const allowed = await saasPublicApiService.checkRateLimit(config.id, config.rateLimitPerHour);
  const remaining = await saasPublicApiService.getRateLimitRemaining(config.id, config.rateLimitPerHour);
  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(config.rateLimitPerHour),
    "X-RateLimit-Remaining": String(remaining),
  };

  if (!allowed) {
    logPublicApiAuthResult(false, config.id);
    return {
      ok: false,
      response: NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: rateHeaders }),
      apiKeyIdForLog: config.id,
    };
  }

  logPublicApiAuthResult(true, config.id);
  return {
    ok: true,
    auth: { apiKeyId: config.id, userId: config.userId, rateLimitPerHour: config.rateLimitPerHour },
    rateHeaders,
  };
}

/** Not a public endpoint — satisfies Pages API route typing for this helper module. */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(404).end();
}
