import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRateLimitRule,
  checkIpRateLimit,
  getClientIp,
  isCriticalRateLimitStrictEnvironment,
} from "@/lib/security/rateLimit";
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
    expect(getRateLimitRule("/api/forms/abc/submit")?.id).toBe("form-submit");
    expect(getRateLimitRule("/api/forms/abc/submit")?.limit).toBe(20);
    expect(getRateLimitRule("/api/os/execute")).toBeNull();
  });

  it("returns 429 when rate limit exceeded", async () => {
    // El contador y su caducidad van ahora en UNA llamada al endpoint
    // `pipeline`, no en `/incr/` + `/expire/`. Este doble seguia simulando la
    // forma antigua, asi que respondia `{result:1}` a todo y la peticion pasaba:
    // la prueba dejo de medir lo que dice medir en cuanto cambio el codigo.
    global.fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/pipeline")) {
        // [INCR -> 11, EXPIRE -> 1]: por encima del techo de 10 de auth-login.
        return new Response(JSON.stringify([{ result: 11 }, { result: 1 }]), { status: 200 });
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

  it("uses in-memory fallback when Redis is unavailable", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_TOKEN;

    const { resetInMemoryRateLimitForTests } = await import("@/lib/security/inMemoryRateLimit");
    resetInMemoryRateLimitForTests();
    const rule = getRateLimitRule("/api/contact")!;

    const first = await checkIpRateLimit({ ip: "203.0.113.1", rule });
    expect(first.allowed).toBe(true);

    for (let i = 0; i < rule.limit; i++) {
      await checkIpRateLimit({ ip: "203.0.113.1", rule });
    }
    const blocked = await checkIpRateLimit({ ip: "203.0.113.1", rule });
    expect(blocked.allowed).toBe(false);
  });

  it("fail-closes critical rules in production when Upstash is unavailable", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_TOKEN;
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAILWAY_ENVIRONMENT_NAME", "production");
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.NELVYON_DEPLOY_ENV;

    const rule = getRateLimitRule("/api/auth/login")!;
    const result = await checkIpRateLimit({ ip: "203.0.113.9", rule });
    expect(result.allowed).toBe(false);
  });

  it("staging NODE_ENV=production without Upstash uses in-memory auth-login (not permanent 429)", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_TOKEN;
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAILWAY_ENVIRONMENT_NAME", "staging");
    delete process.env.NELVYON_DEPLOY_ENV;

    const { resetInMemoryRateLimitForTests } = await import("@/lib/security/inMemoryRateLimit");
    resetInMemoryRateLimitForTests();
    const rule = getRateLimitRule("/api/auth/login")!;
    const first = await checkIpRateLimit({ ip: "203.0.113.44", rule });
    expect(first.allowed).toBe(true);
    expect(isCriticalRateLimitStrictEnvironment()).toBe(false);
  });

  it("uses in-memory fallback when Upstash fetch throws", async () => {
    const { resetInMemoryRateLimitForTests } = await import("@/lib/security/inMemoryRateLimit");
    resetInMemoryRateLimitForTests();
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as typeof fetch;

    const rule = getRateLimitRule("/api/waitlist")!;
    const first = await checkIpRateLimit({ ip: "203.0.113.2", rule });
    expect(first.allowed).toBe(true);
  });

  it("fail-closes critical production rules when Upstash errors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAILWAY_ENVIRONMENT_NAME", "production");
    delete process.env.NELVYON_DEPLOY_ENV;
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as typeof fetch;

    const rule = getRateLimitRule("/api/platform/portal/auth/login")!;
    const result = await checkIpRateLimit({ ip: "203.0.113.2", rule });
    expect(result.allowed).toBe(false);
  });

  it("staging uses memory fallback when Upstash errors on auth-login", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAILWAY_ENVIRONMENT_NAME", "staging");
    delete process.env.NELVYON_DEPLOY_ENV;
    const { resetInMemoryRateLimitForTests } = await import("@/lib/security/inMemoryRateLimit");
    resetInMemoryRateLimitForTests();
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as typeof fetch;

    const rule = getRateLimitRule("/api/auth/login")!;
    const result = await checkIpRateLimit({ ip: "203.0.113.55", rule });
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
  /**
   * Esta prueba DEFENDIA el defecto.
   *
   * Se llamaba «reads first x-forwarded-for hop» y afirmaba justo lo que hacia
   * vulnerable al limitador: quedarse con el primer elemento de la cabecera, que
   * es el que escribe el cliente. Mientras existiera asi, arreglar el defecto se
   * veia como romper una prueba, y dejarlo roto se veia como estar en verde.
   *
   * El detalle completo esta en `lib/security/__tests__/ipDelCliente.test.ts`.
   */
  it("lee el salto que pone el PROXY, no el que manda el cliente", () => {
    const req = mockRequest("https://nelvyon.com/", {
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    });
    // `10.0.0.1` es lo que anadio el proxy; `198.51.100.1` lo eligio quien llamo.
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("dos clientes distintos siguen teniendo cubos distintos", () => {
    // El control: sin el, devolver una constante aprobaria la prueba de arriba.
    const a = getClientIp(mockRequest("https://nelvyon.com/", {
      "x-forwarded-for": "9.9.9.9, 10.0.0.1",
    }));
    const b = getClientIp(mockRequest("https://nelvyon.com/", {
      "x-forwarded-for": "9.9.9.9, 10.0.0.2",
    }));
    expect(a).not.toBe(b);
  });
});
