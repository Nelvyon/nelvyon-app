/**
 * S51 — SaasSectorBenchmarkService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  SaasSectorBenchmarkService,
  type ClientMetricValue,
  type BenchmarkMetricKey,
} from "../SaasSectorBenchmarkService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

const NO_DATA = makeDb(() => []);

// ── listSectors ─────────────────────────────────────────────────────────────────

describe("SaasSectorBenchmarkService — listSectors", () => {
  it("returns sectors without the default key", () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    const sectors = svc.listSectors();
    expect(sectors.length).toBeGreaterThan(5);
    expect(sectors.find((s) => s.key === "default")).toBeUndefined();
    expect(sectors.find((s) => s.key === "ecommerce")?.label).toBe("E-commerce");
  });
});

// ── resolveTenantSector ─────────────────────────────────────────────────────────

describe("SaasSectorBenchmarkService — resolveTenantSector", () => {
  it("maps tenant industry to a benchmark key", async () => {
    const db = makeDb((sql) =>
      sql.includes("FROM saas_tenants") ? [{ industry: "ecommerce" }] : [],
    );
    const svc = new SaasSectorBenchmarkService(db);
    const result = await svc.resolveTenantSector("t1");
    expect(result.key).toBe("ecommerce");
    expect(result.label).toBe("E-commerce");
  });

  it("falls back to default when industry unknown", async () => {
    const db = makeDb((sql) =>
      sql.includes("FROM saas_tenants") ? [{ industry: "underwater-basketweaving" }] : [],
    );
    const svc = new SaasSectorBenchmarkService(db);
    const result = await svc.resolveTenantSector("t1");
    expect(result.key).toBe("default");
  });

  it("falls back to default when tenant row missing", async () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    const result = await svc.resolveTenantSector("t1");
    expect(result.key).toBe("default");
  });

  it("resolves spanish alias (tecnologia → technology)", async () => {
    const db = makeDb(() => [{ industry: "tecnologia" }]);
    const svc = new SaasSectorBenchmarkService(db);
    expect((await svc.resolveTenantSector("t1")).key).toBe("technology");
  });
});

// ── getIndustryMetrics ──────────────────────────────────────────────────────────

describe("SaasSectorBenchmarkService — getIndustryMetrics", () => {
  it("returns numeric medians for known sector", () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    const m = svc.getIndustryMetrics("ecommerce");
    expect(typeof m.email_open_rate).toBe("number");
    expect(typeof m.roas).toBe("number");
  });

  it("qa_score has no industry benchmark (null)", () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    expect(svc.getIndustryMetrics("ecommerce").qa_score).toBeNull();
  });

  it("unknown sector falls back to default medians", () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    const m = svc.getIndustryMetrics("not-a-sector");
    expect(typeof m.email_open_rate).toBe("number");
  });
});

// ── collectClientMetrics ────────────────────────────────────────────────────────

describe("SaasSectorBenchmarkService — collectClientMetrics", () => {
  it("computes email open/click rate from campaigns", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_campanias")) return [{ sent: "1000", opened: "300", clicked: "50" }];
      return [];
    });
    const svc = new SaasSectorBenchmarkService(db);
    const { metrics, sources } = await svc.collectClientMetrics("t1", 30);
    const open = metrics.find((m) => m.key === "email_open_rate")!;
    const click = metrics.find((m) => m.key === "email_click_rate")!;
    expect(open.value).toBeCloseTo(0.3, 4);
    expect(click.value).toBeCloseTo(0.05, 4);
    expect(sources).toContain("Campañas email");
  });

  it("leaves email metrics null when no sends", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_campanias")) return [{ sent: "0", opened: "0", clicked: "0" }];
      return [];
    });
    const svc = new SaasSectorBenchmarkService(db);
    const { metrics } = await svc.collectClientMetrics("t1", 30);
    expect(metrics.find((m) => m.key === "email_open_rate")!.value).toBeNull();
  });

  it("computes conversion rate from attribution", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_lead_attribution")) return [{ visits: "200", conversions: "10" }];
      return [];
    });
    const svc = new SaasSectorBenchmarkService(db);
    const { metrics } = await svc.collectClientMetrics("t1", 30);
    expect(metrics.find((m) => m.key === "conversion_rate")!.value).toBeCloseTo(0.05, 4);
  });

  it("computes roas and cpc from ads cache", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_ads_metrics_cache"))
        return [{ spend: "100", clicks: "50", conversions: "5", revenue: "400" }];
      return [];
    });
    const svc = new SaasSectorBenchmarkService(db);
    const { metrics } = await svc.collectClientMetrics("t1", 30);
    expect(metrics.find((m) => m.key === "roas")!.value).toBeCloseTo(4, 2);
    expect(metrics.find((m) => m.key === "cpc")!.value).toBeCloseTo(2, 2);
  });

  it("computes qa_score average from pack runs", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM nelvyon_pack_runs")) return [{ avg_qa: "88.5" }];
      return [];
    });
    const svc = new SaasSectorBenchmarkService(db);
    const { metrics } = await svc.collectClientMetrics("t1", 30);
    expect(metrics.find((m) => m.key === "qa_score")!.value).toBeCloseTo(88.5, 1);
  });

  it("degraded=true when no data sources resolve", async () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    const { degraded, metrics } = await svc.collectClientMetrics("t1", 30);
    expect(degraded).toBe(true);
    expect(metrics.every((m) => m.value === null)).toBe(true);
  });

  it("survives a throwing query (degraded, not crash)", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_campanias")) throw new Error("table missing");
      return [];
    });
    const svc = new SaasSectorBenchmarkService(db);
    await expect(svc.collectClientMetrics("t1", 30)).resolves.toBeDefined();
  });
});

// ── compareMetrics ──────────────────────────────────────────────────────────────

function clientMetric(key: BenchmarkMetricKey, value: number | null): ClientMetricValue {
  const unit = key === "roas" ? "x" : key === "cpc" ? "€" : key === "qa_score" ? "pts" : "%";
  return { key, label: key, value, unit: unit as ClientMetricValue["unit"], source: "test" };
}

describe("SaasSectorBenchmarkService — compareMetrics", () => {
  it("rates higher-better metric above industry as excelente", () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    const cmp = svc.compareMetrics(
      [clientMetric("email_open_rate", 0.4)],
      { email_open_rate: 0.2 },
    );
    const row = cmp.find((c) => c.key === "email_open_rate")!;
    expect(row.deltaPct).toBeCloseTo(100, 0);
    expect(row.rating).toBe("excelente");
  });

  it("rates lower-better metric below industry as good (inverted)", () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    // CPC lower than industry → good even though delta is negative
    const cmp = svc.compareMetrics(
      [clientMetric("cpc", 1.0)],
      { cpc: 2.0 },
    );
    const row = cmp.find((c) => c.key === "cpc")!;
    expect(row.deltaPct).toBeCloseTo(-50, 0);
    expect(row.rating).toBe("excelente");
  });

  it("rates much-worse higher-better metric as critico", () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    const cmp = svc.compareMetrics(
      [clientMetric("conversion_rate", 0.005)],
      { conversion_rate: 0.05 },
    );
    expect(cmp.find((c) => c.key === "conversion_rate")!.rating).toBe("critico");
  });

  it("returns sin_dato when client value missing", () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    const cmp = svc.compareMetrics([clientMetric("roas", null)], { roas: 3.5 });
    expect(cmp.find((c) => c.key === "roas")!.rating).toBe("sin_dato");
  });

  it("returns sin_dato when industry value missing", () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    const cmp = svc.compareMetrics([clientMetric("qa_score", 90)], { qa_score: null });
    expect(cmp.find((c) => c.key === "qa_score")!.rating).toBe("sin_dato");
  });
});

// ── buildDashboard ──────────────────────────────────────────────────────────────

describe("SaasSectorBenchmarkService — buildDashboard", () => {
  it("assembles dashboard with summary score", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_tenants")) return [{ industry: "ecommerce" }];
      if (sql.includes("FROM saas_campanias")) return [{ sent: "1000", opened: "400", clicked: "60" }];
      return [];
    });
    const svc = new SaasSectorBenchmarkService(db);
    const dash = await svc.buildDashboard("t1");
    expect(dash.sectorKey).toBe("ecommerce");
    expect(dash.summary.metricsTracked).toBeGreaterThanOrEqual(2);
    expect(dash.summary.metricsCompared).toBeGreaterThanOrEqual(1);
    expect(dash.summary.overallScore).toBeGreaterThanOrEqual(0);
    expect(dash.summary.overallScore).toBeLessThanOrEqual(100);
  });

  it("honors sectorKey override", async () => {
    const db = makeDb((sql) =>
      sql.includes("FROM saas_tenants") ? [{ industry: "ecommerce" }] : [],
    );
    const svc = new SaasSectorBenchmarkService(db);
    const dash = await svc.buildDashboard("t1", { sectorKey: "finance" });
    expect(dash.sectorKey).toBe("finance");
    expect(dash.sectorLabel).toBe("Finanzas");
  });

  it("degraded dashboard when tenant has no metrics", async () => {
    const db = makeDb((sql) =>
      sql.includes("FROM saas_tenants") ? [{ industry: "ecommerce" }] : [],
    );
    const svc = new SaasSectorBenchmarkService(db);
    const dash = await svc.buildDashboard("t1");
    expect(dash.degraded).toBe(true);
    expect(dash.summary.overallScore).toBe(0);
  });
});

// ── snapshots ───────────────────────────────────────────────────────────────────

describe("SaasSectorBenchmarkService — snapshots", () => {
  it("saveSnapshot returns inserted id", async () => {
    const db = makeDb((sql) => (sql.includes("INSERT INTO saas_benchmark_snapshots") ? [{ id: "snap-1" }] : []));
    const svc = new SaasSectorBenchmarkService(db);
    const dash = await svc.buildDashboard("t1");
    // resolveTenantSector also queries; rebuild with a combined handler
    const id = await svc.saveSnapshot({ ...dash, tenantId: "t1" });
    expect(id).toBe("snap-1");
  });

  it("getLatestSnapshot returns null when none", async () => {
    const svc = new SaasSectorBenchmarkService(NO_DATA);
    expect(await svc.getLatestSnapshot("t1")).toBeNull();
  });

  it("getLatestSnapshot maps row to dashboard", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_benchmark_snapshots"))
        return [{
          tenant_id: "t1", sector_key: "ecommerce", sector_label: "E-commerce", period_days: 30,
          client_metrics: [], industry_metrics: {}, comparisons: [],
          summary: { metricsTracked: 0, metricsCompared: 0, aboveIndustry: 0, belowIndustry: 0, overallScore: 0 },
          data_sources: [], degraded: false, computed_at: new Date().toISOString(),
        }];
      return [];
    });
    const svc = new SaasSectorBenchmarkService(db);
    const dash = await svc.getLatestSnapshot("t1");
    expect(dash?.sectorKey).toBe("ecommerce");
  });

  it("refreshBenchmark builds and persists", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_tenants")) return [{ industry: "ecommerce" }];
      if (sql.includes("INSERT INTO saas_benchmark_snapshots")) return [{ id: "snap-2" }];
      return [];
    });
    const svc = new SaasSectorBenchmarkService(db);
    const dash = await svc.refreshBenchmark("t1");
    expect(dash.sectorKey).toBe("ecommerce");
  });
});
