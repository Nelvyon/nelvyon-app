import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DbClient } from "../../db/DbClient";
import {
  aggregateHealthStatus,
  checkDatabase,
  checkRedis,
  healthHttpStatus,
  runDeepHealthChecks,
} from "../healthChecks";

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: vi.fn(),
  },
}));

describe("healthChecks", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.mocked(DbClient.getInstance).mockReturnValue({
      query: vi.fn().mockResolvedValue([{ ok: 1 }]),
    } as unknown as InstanceType<typeof DbClient>);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.mocked(DbClient.getInstance).mockReset();
  });

  it("checkDatabase ok → status ok y latencyMs > 0", async () => {
    const r = await checkDatabase();
    expect(r.status).toBe("ok");
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("checkDatabase timeout → status down", async () => {
    vi.useFakeTimers();
    vi.mocked(DbClient.getInstance).mockReturnValue({
      query: () => new Promise(() => {}),
    } as unknown as InstanceType<typeof DbClient>);
    const p = checkDatabase(25);
    await vi.advanceTimersByTimeAsync(40);
    const r = await p;
    expect(r.status).toBe("down");
    expect(r.error).toBe("Connection failed");
  });

  it("checkRedis ok → status ok", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis-hc.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      if (u.includes("/ping")) {
        return new Response(JSON.stringify({ result: "PONG" }), { status: 200 });
      }
      return new Response("nope", { status: 404 });
    }) as typeof fetch;

    const r = await checkRedis();
    expect(r.status).toBe("ok");
    expect(global.fetch).toHaveBeenCalled();
  });

  it("aggregateHealthStatus unhealthy cuando database down", () => {
    expect(
      aggregateHealthStatus({
        database: { status: "down", latencyMs: 1 },
        redis: { status: "ok", latencyMs: 1 },
        openai: { status: "ok", latencyMs: 1 },
        stripe: { status: "ok", latencyMs: 1 },
        ses: { status: "ok", latencyMs: 1 },
      }),
    ).toBe("unhealthy");
  });

  it("healthHttpStatus 503 solo cuando unhealthy", () => {
    expect(healthHttpStatus("unhealthy")).toBe(503);
    expect(healthHttpStatus("healthy")).toBe(200);
    expect(healthHttpStatus("degraded")).toBe(200);
  });
});

describe("/api/health GET (liveness)", () => {
  it("retorna 200 con status ok, version y timestamp", async () => {
    const { GET } = await import("../../../apps/web/src/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; version: string; timestamp: string };
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});

describe("/api/health/deep GET", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    vi.mocked(DbClient.getInstance).mockReset();
    vi.resetModules();
  });

  async function setupAllChecksPassing() {
    vi.mocked(DbClient.getInstance).mockReturnValue({
      query: vi.fn().mockResolvedValue([{ ok: 1 }]),
    } as unknown as InstanceType<typeof DbClient>);
    process.env.UPSTASH_REDIS_REST_URL = "https://redis-hc.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.SES_FROM_EMAIL = "noreply@test.com";
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      if (u.includes("/ping")) {
        return new Response(JSON.stringify({ result: "PONG" }), { status: 200 });
      }
      return new Response(null, { status: 200 });
    }) as typeof fetch;
  }

  it("retorna 200 y healthy cuando todo ok", async () => {
    await setupAllChecksPassing();
    const { GET } = await import("../../../apps/web/src/app/api/health/deep/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("healthy");
  });

  it("retorna 503 cuando database down", async () => {
    await setupAllChecksPassing();
    vi.mocked(DbClient.getInstance).mockReturnValue({
      query: vi.fn().mockRejectedValue(new Error("internal db failure")),
    } as unknown as InstanceType<typeof DbClient>);
    const { GET } = await import("../../../apps/web/src/app/api/health/deep/route");
    const res = await GET();
    expect(res.status).toBe(503);
    const body = (await res.json()) as { status: string; checks: { database: { status: string } } };
    expect(body.status).toBe("unhealthy");
    expect(body.checks.database.status).toBe("down");
  });

  it("runDeepHealthChecks no expone stack en errores", async () => {
    await setupAllChecksPassing();
    vi.mocked(DbClient.getInstance).mockReturnValue({
      query: vi.fn().mockRejectedValue(new Error("secret stack trace")),
    } as unknown as InstanceType<typeof DbClient>);
    const body = await runDeepHealthChecks();
    expect(body.checks.database.error).toBe("Connection failed");
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
