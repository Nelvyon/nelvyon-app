/**
 * Infrastructure Tests — Validates core modules:
 * - i18n-registry: extensible translation system
 * - observability: metrics collection & health summary
 * - scalability: caching, pagination, rate limiting
 * - ai-helper: AI call wrapper
 */
import { describe, it, expect, beforeEach } from "vitest";

// ── i18n Registry ──
import {
  registerLocale,
  registerTranslations,
  getTranslation,
  getRegisteredLocales,
  getLocaleMeta,
  isLocaleRegistered,
  getLocaleDir,
  seedFromStatic,
} from "@/lib/i18n-registry";

describe("i18n-registry", () => {
  it("has 10 built-in locales", () => {
    const locales = getRegisteredLocales();
    expect(locales.length).toBeGreaterThanOrEqual(10);
    expect(locales.map((l) => l.code)).toContain("es");
    expect(locales.map((l) => l.code)).toContain("en");
    expect(locales.map((l) => l.code)).toContain("ar");
  });

  it("registers a new locale dynamically", () => {
    registerLocale({ code: "sw", name: "Kiswahili", flag: "🇰🇪" });
    expect(isLocaleRegistered("sw")).toBe(true);
    expect(getLocaleMeta("sw")?.name).toBe("Kiswahili");
  });

  it("registers and retrieves translations", () => {
    registerTranslations("sw", "test", { hello: "Habari", goodbye: "Kwaheri" });
    expect(getTranslation("sw", "test", "hello")).toBe("Habari");
    expect(getTranslation("sw", "test", "goodbye")).toBe("Kwaheri");
  });

  it("falls back through locale chain: requested -> en -> es -> key", () => {
    registerTranslations("en", "fb", { onlyEn: "English Only" });
    registerTranslations("es", "fb", { onlyEs: "Solo Español" });

    // Unknown locale falls back to en
    expect(getTranslation("xx", "fb", "onlyEn")).toBe("English Only");
    // Unknown locale + unknown en falls back to es
    expect(getTranslation("xx", "fb", "onlyEs")).toBe("Solo Español");
    // Completely unknown returns key
    expect(getTranslation("xx", "fb", "nonexistent")).toBe("nonexistent");
  });

  it("seedFromStatic populates registry", () => {
    seedFromStatic("seed", {
      es: { greeting: "Hola" },
      en: { greeting: "Hello" },
    });
    expect(getTranslation("es", "seed", "greeting")).toBe("Hola");
    expect(getTranslation("en", "seed", "greeting")).toBe("Hello");
  });

  it("returns correct text direction", () => {
    expect(getLocaleDir("ar")).toBe("rtl");
    expect(getLocaleDir("es")).toBe("ltr");
    expect(getLocaleDir("en")).toBe("ltr");
  });
});

// ── Observability ──
import {
  recordMetric,
  recordPageView,
  getHealthSummary,
  getRecentMetrics,
  isRateLimited,
  resetMetrics,
} from "@/lib/observability";

describe("observability", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("records metrics and computes health summary", () => {
    recordMetric({ endpoint: "/api/test", module: "crm", latencyMs: 100, status: "success" });
    recordMetric({ endpoint: "/api/test", module: "crm", latencyMs: 200, status: "success" });
    recordMetric({ endpoint: "/api/fail", module: "crm", latencyMs: 500, status: "error", statusCode: 500 });

    const health = getHealthSummary(60);
    expect(health.totalRequests).toBe(3);
    expect(health.successRate).toBeCloseTo(66.67, 0);
    expect(health.avgLatencyMs).toBeGreaterThan(0);
    expect(health.errorsByEndpoint["/api/fail"]).toBe(1);
  });

  it("tracks AI calls separately", () => {
    recordMetric({ endpoint: "/api/ai", module: "ai", latencyMs: 800, status: "success", isAI: true });
    recordMetric({ endpoint: "/api/ai", module: "ai", latencyMs: 1200, status: "error", isAI: true });

    const health = getHealthSummary(60);
    expect(health.aiCalls.total).toBe(2);
    expect(health.aiCalls.success).toBe(1);
    expect(health.aiCalls.avgLatencyMs).toBe(1000);
  });

  it("records page views", () => {
    recordPageView("dashboard");
    recordPageView("dashboard");
    recordPageView("crm");

    const health = getHealthSummary(60);
    const dashMod = health.moduleUsage.find((m) => m.module === "dashboard");
    expect(dashMod?.views).toBe(2);
  });

  it("rate limiter blocks after threshold", () => {
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited("test-key", 5, 60_000)).toBe(false);
    }
    // 6th call should be blocked
    expect(isRateLimited("test-key", 5, 60_000)).toBe(true);
  });

  it("getRecentMetrics filters by time window", () => {
    recordMetric({ endpoint: "/api/a", module: "a", latencyMs: 50, status: "success" });
    const recent = getRecentMetrics(30);
    expect(recent.length).toBe(1);
  });
});

// ── Scalability ──
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheClear,
  paginate,
  batchIds,
} from "@/lib/scalability";

describe("scalability", () => {
  beforeEach(() => {
    cacheClear();
  });

  it("cacheSet and cacheGet work correctly", () => {
    cacheSet("key1", { value: 42 });
    expect(cacheGet<{ value: number }>("key1")?.value).toBe(42);
  });

  it("cache expires after TTL", async () => {
    cacheSet("short", "data", 1); // 1ms TTL
    await new Promise((r) => setTimeout(r, 10));
    expect(cacheGet("short")).toBeUndefined();
  });

  it("cacheInvalidate removes specific key", () => {
    cacheSet("a", 1);
    cacheSet("b", 2);
    cacheInvalidate("a");
    expect(cacheGet("a")).toBeUndefined();
    expect(cacheGet("b")).toBe(2);
  });

  it("cacheInvalidate with wildcard removes matching keys", () => {
    cacheSet("user:1", "alice");
    cacheSet("user:2", "bob");
    cacheSet("post:1", "hello");
    cacheInvalidate("user:*");
    expect(cacheGet("user:1")).toBeUndefined();
    expect(cacheGet("user:2")).toBeUndefined();
    expect(cacheGet("post:1")).toBe("hello");
  });

  it("paginate returns correct pages", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const p1 = paginate(items, 1, 10);
    expect(p1.data).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(p1.totalPages).toBe(3);
    expect(p1.hasNext).toBe(true);
    expect(p1.hasPrev).toBe(false);

    const p3 = paginate(items, 3, 10);
    expect(p3.data).toEqual([20, 21, 22, 23, 24]);
    expect(p3.hasNext).toBe(false);
    expect(p3.hasPrev).toBe(true);
  });

  it("paginate handles empty array", () => {
    const result = paginate([], 1, 10);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("paginate clamps out-of-range pages", () => {
    const items = [1, 2, 3];
    const result = paginate(items, 999, 10);
    expect(result.page).toBe(1);
    expect(result.data).toEqual([1, 2, 3]);
  });

  it("batchIds splits correctly", () => {
    const ids = Array.from({ length: 120 }, (_, i) => `id-${i}`);
    const batches = batchIds(ids, 50);
    expect(batches.length).toBe(3);
    expect(batches[0].length).toBe(50);
    expect(batches[1].length).toBe(50);
    expect(batches[2].length).toBe(20);
  });
});