import type { NextRequest } from "next/server";

export interface RateLimitRule {
  id: string;
  match: (pathname: string) => boolean;
  limit: number;
  windowSec: number;
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
  },
  {
    id: "auth-login",
    match: (p) => p === "/api/auth/login",
    limit: 10,
    windowSec: 60,
  },
  {
    id: "public-api",
    match: (p) => p.startsWith("/api/public/"),
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
 * Fixed-window rate limit per IP. Fail-open when Redis is unavailable.
 */
export async function checkIpRateLimit(params: {
  ip: string;
  rule: RateLimitRule;
}): Promise<RateLimitResult> {
  const config = getUpstashConfig();
  if (!config) {
    return { allowed: true, retryAfter: params.rule.windowSec };
  }

  const key = `ratelimit:${params.rule.id}:${params.ip}`;

  try {
    const count = await upstashIncrWithExpire(config.url, config.token, key, params.rule.windowSec);
    if (count > params.rule.limit) {
      return { allowed: false, retryAfter: params.rule.windowSec };
    }
    return { allowed: true, retryAfter: params.rule.windowSec };
  } catch {
    return { allowed: true, retryAfter: params.rule.windowSec };
  }
}
