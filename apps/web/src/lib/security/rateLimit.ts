import type { NextRequest } from "next/server";
import { checkInMemoryRateLimit } from "./inMemoryRateLimit";

export interface RateLimitRule {
  id: string;
  match: (pathname: string) => boolean;
  limit: number;
  windowSec: number;
  requireSharedStoreInProduction?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

const RULES: RateLimitRule[] = [
  {
    id: "auth-signup",
    match: (p) => p === "/api/auth/register" || p === "/api/auth/signup",
    limit: 5,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "auth-login",
    match: (p) => p === "/api/auth/login",
    limit: 10,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "auth-forgot-password",
    match: (p) => p === "/api/auth/forgot-password" || p === "/api/auth/reset-password",
    limit: 5,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "portal-auth-login",
    match: (p) => p === "/api/platform/portal/auth/login",
    limit: 10,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "saas-sms",
    match: (p) => p === "/api/saas/sms",
    limit: 10,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "lms-enroll",
    match: (p) => /^\/api\/lms\/courses\/[^/]+\/enroll$/.test(p),
    limit: 10,
    windowSec: 60,
  },
  {
    id: "lms-progress-write",
    match: (p) => /^\/api\/lms\/progress\/[^/]+\/lesson\/[^/]+$/.test(p),
    limit: 30,
    windowSec: 60,
  },
  {
    id: "public-api",
    match: (p) => p.startsWith("/api/public/"),
    limit: 30,
    windowSec: 60,
  },
  {
    id: "webhooks",
    match: (p) => p.startsWith("/api/webhooks/"),
    limit: 200,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "early-adopter",
    match: (p) => p.startsWith("/api/early-adopter/"),
    limit: 20,
    windowSec: 60,
  },
  {
    id: "contact",
    match: (p) => p === "/api/contact",
    limit: 10,
    windowSec: 60,
  },
  {
    id: "waitlist",
    match: (p) => p === "/api/waitlist",
    limit: 10,
    windowSec: 60,
  },
  {
    id: "form-submit",
    match: (p) => /^\/api\/forms\/[^/]+\/submit$/.test(p),
    limit: 20,
    windowSec: 60,
  },
  {
    id: "site-chat",
    match: (p) => p === "/api/nelvyon-site/chat",
    limit: 15,
    windowSec: 60,
  },
  {
    id: "saas-crm-export",
    match: (p) => p === "/api/saas/crm/contacts/export" || p === "/api/saas/crm/contacts/import",
    limit: 10,
    windowSec: 60,
  },
  {
    id: "saas-gdpr",
    match: (p) => p.startsWith("/api/saas/compliance/gdpr"),
    limit: 10,
    windowSec: 60,
  },
  {
    id: "saas-campania-launch",
    match: (p) => /^\/api\/saas\/campanias\/[^/]+\/launch$/.test(p),
    limit: 5,
    windowSec: 60,
  },
  {
    id: "saas-webhook-in",
    match: (p) => p === "/api/saas/workflows/webhook-in",
    limit: 60,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "saas-audit",
    match: (p) => p.startsWith("/api/saas/audit"),
    limit: 30,
    windowSec: 60,
  },
];

export function getRateLimitRule(pathname: string): RateLimitRule | null {
  return RULES.find((r) => r.match(pathname)) ?? null;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Whether critical auth/webhook rules must fail-closed without Upstash.
 *
 * Staging Railway runs `NODE_ENV=production` but `RAILWAY_ENVIRONMENT=staging`.
 * Treating staging as "strict prod" permanently 429s password login when Upstash
 * is absent — blocks certification without adding paid Redis. Production and
 * unknown production-like hosts remain fail-closed.
 */
export function isCriticalRateLimitStrictEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.NODE_ENV !== "production") return false;

  const explicit = (env.NELVYON_DEPLOY_ENV ?? "").trim().toLowerCase();
  if (
    explicit === "staging" ||
    explicit === "development" ||
    explicit === "dev" ||
    explicit === "test"
  ) {
    return false;
  }
  if (explicit === "production" || explicit === "prod") return true;

  const railway = (
    env.RAILWAY_ENVIRONMENT_NAME ??
    env.RAILWAY_ENVIRONMENT ??
    ""
  )
    .trim()
    .toLowerCase();
  if (
    railway === "staging" ||
    railway === "preview" ||
    railway === "development" ||
    railway === "dev"
  ) {
    return false;
  }
  if (railway === "production" || railway === "prod") return true;

  // Bare NODE_ENV=production with no staging markers — keep fail-closed.
  return true;
}

function getUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_TOKEN;
  if (!url?.trim() || !token?.trim()) return null;
  return { url: url.replace(/\/$/, ""), token: token.trim() };
}

async function upstashIncrWithExpire(
  baseUrl: string,
  token: string,
  key: string,
  windowSec: number,
): Promise<number> {
  const headers = { Authorization: `Bearer ${token}` };
  const incrRes = await fetch(`${baseUrl}/incr/${encodeURIComponent(key)}`, {
    method: "POST",
    headers,
  });
  if (!incrRes.ok) {
    throw new Error(`Upstash INCR failed: ${incrRes.status}`);
  }
  const incrBody = (await incrRes.json()) as { result?: number };
  const count = typeof incrBody.result === "number" ? incrBody.result : 0;
  if (count === 1) {
    await fetch(`${baseUrl}/expire/${encodeURIComponent(key)}/${windowSec}`, {
      method: "POST",
      headers,
    });
  }
  return count;
}

/**
 * Fixed-window rate limit per IP.
 * Uses Upstash when configured; only non-critical routes (and staging) may fall back to per-instance memory.
 * Production critical routes without Upstash remain fail-closed.
 */
export async function checkIpRateLimit(params: {
  ip: string;
  rule: RateLimitRule;
}): Promise<RateLimitResult> {
  const memoryKey = `${params.rule.id}:${params.ip}`;
  const failClosed = (): RateLimitResult => ({
    allowed: false,
    retryAfter: params.rule.windowSec,
  });
  const memoryFallback = (): RateLimitResult =>
    checkInMemoryRateLimit({
      key: memoryKey,
      limit: params.rule.limit,
      windowSec: params.rule.windowSec,
    });

  const config = getUpstashConfig();
  const strict = isCriticalRateLimitStrictEnvironment();
  if (!config) {
    if (strict && params.rule.requireSharedStoreInProduction) {
      console.error("[rate-limit] Upstash required for critical production rule", {
        rule: params.rule.id,
      });
      return failClosed();
    }
    if (process.env.NODE_ENV === "production") {
      console.warn("[rate-limit] Upstash not configured — using in-memory fallback", {
        rule: params.rule.id,
        strict,
      });
    }
    return memoryFallback();
  }

  const key = `ratelimit:${params.rule.id}:${params.ip}`;

  try {
    const count = await upstashIncrWithExpire(config.url, config.token, key, params.rule.windowSec);
    if (count > params.rule.limit) {
      return { allowed: false, retryAfter: params.rule.windowSec };
    }
    return { allowed: true, retryAfter: params.rule.windowSec };
  } catch (err) {
    if (strict && params.rule.requireSharedStoreInProduction) {
      console.error("[rate-limit] Upstash error on critical production rule", {
        rule: params.rule.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return failClosed();
    }
    console.warn("[rate-limit] Upstash error — in-memory fallback", {
      rule: params.rule.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return memoryFallback();
  }
}
