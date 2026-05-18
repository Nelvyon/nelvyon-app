import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRateLimitRule, checkIpRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { REQUEST_ID_HEADER, resolveRequestId, withRequestId } from "@/lib/security/requestId";
import { NextResponse } from "next/server";

function mockRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return {
    nextUrl: new URL(url),
    headers: new Headers(headers),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

describe("security rateLimit", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("getRateLimitRule matches login and register", () => {
    expect(getRateLimitRule("/api/auth/login")?.limit).toBe(10);
    expect(getRateLimitRule("/api/auth/register")?.limit).toBe(5);
    expect(getRateLimitRule("/api/public/v1/keys")?.limit).toBe(30);
    expect(getRateLimitRule("/api/os/execute")).toBeNull();
  });

  it("returns 429 when rate limit exceeded", async () => {
    global.fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/incr/")) {
        return new Response(JSON.stringify({ result: 11 }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: 1 }), { status: 200 });
    }) as typeof fetch;

    const result = await checkIpRateLimit({
      ip: "203.0.113.1",
      rule: getRateLimitRule("/api/auth/login")!,
    });

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(60);
  });

  it("fail-open when Redis is unavailable", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_TOKEN;

    const result = await checkIpRateLimit({
      ip: "203.0.113.1",
      rule: getRateLimitRule("/api/auth/login")!,
    });

    expect(result.allowed).toBe(true);
  });

  it("fail-open when Upstash fetch throws", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as typeof fetch;

    const result = await checkIpRateLimit({
      ip: "203.0.113.1",
      rule: getRateLimitRule("/api/auth/register")!,
    });

    expect(result.allowed).toBe(true);
  });
});

describe("resolveRequestId", () => {
  it("reuses x-request-id from inbound request", () => {
    const req = mockRequest("https://nelvyon.com/api/auth/login", {
      [REQUEST_ID_HEADER]: "req-existing-123",
    });
    expect(resolveRequestId(req)).toBe("req-existing-123");
  });

  it("generates UUID when no correlation header", () => {
    const req = mockRequest("https://nelvyon.com/pricing");
    const id = resolveRequestId(req);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("withRequestId", () => {
  it("sets X-Request-ID on JSON 429 responses", async () => {
    const requestId = "test-req-id-abc";
    const res = withRequestId(
      NextResponse.json({ error: "Too many requests", retryAfter: 60 }, { status: 429 }),
      requestId,
    );
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe(requestId);
    const body = (await res.json()) as { error: string; retryAfter: number };
    expect(body.error).toBe("Too many requests");
    expect(body.retryAfter).toBe(60);
  });
});

describe("getClientIp", () => {
  it("reads first x-forwarded-for hop", () => {
    const req = mockRequest("https://nelvyon.com/", {
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    });
    expect(getClientIp(req)).toBe("198.51.100.1");
  });
});
