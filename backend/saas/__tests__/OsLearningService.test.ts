import { describe, it, expect, vi } from "vitest";
import { OsLearningService } from "../OsLearningService";
import type { GoogleAnalytics4Service } from "../../integrations/GoogleAnalytics4Service";
import type { GA4ReportRow } from "../../integrations/GoogleAnalytics4Service";

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };

function makeGA4(rows: GA4ReportRow[]): Partial<GoogleAnalytics4Service> {
  return { runReport: vi.fn(async () => rows) };
}

function makeDb(weights: Array<{ sector: string; cvr: number; sessions?: number; conversions?: number; updated_at?: string }> = []): Partial<DbPort> & { upserted: Array<unknown[]> } {
  const upserted: Array<unknown[]> = [];
  return {
    upserted,
    query: async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO os_seed_weights")) {
        upserted.push(params ?? []);
        return [];
      }
      if (sql.includes("SELECT sector, cvr FROM os_seed_weights")) {
        return weights as never;
      }
      if (sql.includes("ORDER BY cvr DESC LIMIT")) {
        return weights.slice(0, Number(params?.[0] ?? 10)) as never;
      }
      return [];
    },
  };
}

// ── runLearningLoop ───────────────────────────────────────────────────────────

describe("OsLearningService.runLearningLoop", () => {
  it("returns zero sectors when GA4 rows are empty", async () => {
    const db = makeDb();
    const svc = new OsLearningService(db as DbPort, makeGA4([]) as GoogleAnalytics4Service);
    const r = await svc.runLearningLoop("user-1");
    expect(r.processedSectors).toBe(0);
    expect(r.totalSessions).toBe(0);
    expect(r.weights).toEqual({});
  });

  it("maps dental pagePath to 'dental' sector and upserts", async () => {
    const db = makeDb();
    const svc = new OsLearningService(db as DbPort, makeGA4([
      { dimensions: { pagePath: "/landing/dental-clinic" }, metrics: { sessions: "200", conversions: "10" } },
    ]) as GoogleAnalytics4Service);
    const r = await svc.runLearningLoop("user-1");
    expect(r.processedSectors).toBe(1);
    expect(r.weights["dental"]).toBeCloseTo(0.05);
    expect(db.upserted).toHaveLength(1);
    expect(db.upserted[0]![0]).toBe("dental");
  });

  it("aggregates multiple rows for the same sector", async () => {
    const db = makeDb();
    const svc = new OsLearningService(db as DbPort, makeGA4([
      { dimensions: { pagePath: "/restaurant/menu" }, metrics: { sessions: "100", conversions: "5" } },
      { dimensions: { pagePath: "/restaurant/reservas" }, metrics: { sessions: "200", conversions: "20" } },
    ]) as GoogleAnalytics4Service);
    const r = await svc.runLearningLoop("user-1");
    expect(r.totalSessions).toBe(300);
    expect(r.totalConversions).toBe(25);
    expect(r.weights["restaurant"]).toBeCloseTo(25 / 300);
    expect(db.upserted).toHaveLength(1); // 1 sector
  });

  it("ignores rows that don't match any known sector", async () => {
    const db = makeDb();
    const svc = new OsLearningService(db as DbPort, makeGA4([
      { dimensions: { pagePath: "/random/unknown-page" }, metrics: { sessions: "50", conversions: "1" } },
    ]) as GoogleAnalytics4Service);
    const r = await svc.runLearningLoop("user-1");
    expect(r.processedSectors).toBe(0);
    expect(db.upserted).toHaveLength(0);
  });

  it("handles multiple distinct sectors", async () => {
    const db = makeDb();
    const svc = new OsLearningService(db as DbPort, makeGA4([
      { dimensions: { pagePath: "/fitness/gym" }, metrics: { sessions: "500", conversions: "50" } },
      { dimensions: { pagePath: "/clinica/medicina" }, metrics: { sessions: "300", conversions: "6" } },
      { dimensions: { pagePath: "/ecommerce/tienda" }, metrics: { sessions: "1000", conversions: "30" } },
    ]) as GoogleAnalytics4Service);
    const r = await svc.runLearningLoop("u");
    expect(r.processedSectors).toBe(3);
    expect(Object.keys(r.weights)).toHaveLength(3);
    expect(r.weights["fitness"]).toBeCloseTo(0.1);
  });

  it("computes CVR = 0 when sessions = 0", async () => {
    const db = makeDb();
    const svc = new OsLearningService(db as DbPort, makeGA4([
      { dimensions: { pagePath: "/dental/promo" }, metrics: { sessions: "0", conversions: "0" } },
    ]) as GoogleAnalytics4Service);
    const r = await svc.runLearningLoop("u");
    // sessions=0 → sector skipped (division guard)
    expect(r.weights["dental"] ?? 0).toBe(0);
  });

  it("maps Spanish synonym 'restaurante' to restaurant sector", async () => {
    const db = makeDb();
    const svc = new OsLearningService(db as DbPort, makeGA4([
      { dimensions: { pagePath: "/paginaweb/restaurante-madrid" }, metrics: { sessions: "80", conversions: "4" } },
    ]) as GoogleAnalytics4Service);
    const r = await svc.runLearningLoop("u");
    expect(Object.keys(r.weights)).toContain("restaurant");
  });

  it("sets runAt to a valid ISO date string", async () => {
    const db = makeDb();
    const svc = new OsLearningService(db as DbPort, makeGA4([]) as GoogleAnalytics4Service);
    const r = await svc.runLearningLoop("u");
    expect(() => new Date(r.runAt)).not.toThrow();
    expect(new Date(r.runAt).getFullYear()).toBeGreaterThan(2020);
  });
});

// ── getSectorWeights ──────────────────────────────────────────────────────────

describe("OsLearningService.getSectorWeights", () => {
  it("returns empty object when table is empty", async () => {
    const db = makeDb([]);
    const svc = new OsLearningService(db as DbPort, makeGA4([]) as GoogleAnalytics4Service);
    const w = await svc.getSectorWeights();
    expect(w).toEqual({});
  });

  it("returns cvr keyed by sector", async () => {
    const db = makeDb([
      { sector: "dental", cvr: 0.08 },
      { sector: "ecommerce", cvr: 0.03 },
    ]);
    const svc = new OsLearningService(db as DbPort, makeGA4([]) as GoogleAnalytics4Service);
    const w = await svc.getSectorWeights();
    expect(w["dental"]).toBeCloseTo(0.08);
    expect(w["ecommerce"]).toBeCloseTo(0.03);
  });
});

// ── getTopSectors ─────────────────────────────────────────────────────────────

describe("OsLearningService.getTopSectors", () => {
  it("returns top N sectors sorted by CVR", async () => {
    const db = makeDb([
      { sector: "dental", cvr: 0.08, sessions: 100, conversions: 8, updated_at: new Date().toISOString() },
      { sector: "fitness", cvr: 0.12, sessions: 200, conversions: 24, updated_at: new Date().toISOString() },
    ]);
    const svc = new OsLearningService(db as DbPort, makeGA4([]) as GoogleAnalytics4Service);
    const top = await svc.getTopSectors(2);
    expect(top).toHaveLength(2);
    expect(top[0].sector).toBe("dental"); // DB returns pre-sorted
  });
});
