import { describe, expect, it, vi } from "vitest";

import { SaasAnalyticsService, saasAnalyticsService } from "../SaasAnalyticsService";

describe("SaasAnalyticsService", () => {
  it("getClientAnalytics con 0 jobs devuelve métricas vacías correctas", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    const out = await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa", "30d");
    expect(out.totalJobs).toBe(0);
    expect(out.completedJobs).toBe(0);
    expect(out.failedJobs).toBe(0);
    expect(out.successRate).toBe(0);
    expect(out.totalAssets).toBe(0);
    expect(out.serviceMetrics).toEqual([]);
    expect(out.monthlyTrend).toEqual([]);
  });

  it("getClientAnalytics calcula successRate correctamente", async () => {
    const jobs = [
      { status: "completed", service_id: "seo_premium", duration_ms: 100, created_at: "2026-05-01T00:00:00.000Z" },
      { status: "completed", service_id: "seo_premium", duration_ms: 100, created_at: "2026-05-02T00:00:00.000Z" },
      { status: "failed", service_id: "seo_premium", duration_ms: 100, created_at: "2026-05-03T00:00:00.000Z" },
      { status: "failed", service_id: "seo_premium", duration_ms: 100, created_at: "2026-05-04T00:00:00.000Z" },
    ];
    const query = vi.fn().mockResolvedValueOnce(jobs).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    const out = await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa");
    expect(out.successRate).toBe(0.5);
  });

  it("getClientAnalytics calcula estimatedValueEur = completedJobs * 97", async () => {
    const jobs = [
      { status: "completed", service_id: "seo_premium", duration_ms: 100, created_at: "2026-05-01T00:00:00.000Z" },
      { status: "completed", service_id: "ads_premium", duration_ms: 100, created_at: "2026-05-02T00:00:00.000Z" },
      { status: "failed", service_id: "ads_premium", duration_ms: 100, created_at: "2026-05-03T00:00:00.000Z" },
    ];
    const query = vi.fn().mockResolvedValueOnce(jobs).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    const out = await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa");
    expect(out.completedJobs).toBe(2);
    expect(out.estimatedValueEur).toBe(194);
  });

  it("getClientAnalytics period='7d' usa ventana de 7 días en query", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa", "7d");
    const args = query.mock.calls[0]?.[1] as unknown[];
    const since = String(args[2]);
    const diffDays = (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.5);
    expect(diffDays).toBeLessThan(7.5);
  });

  it("getClientAnalytics period='90d' usa ventana de 90 días en query", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa", "90d");
    const args = query.mock.calls[0]?.[1] as unknown[];
    const since = String(args[2]);
    const diffDays = (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(89.5);
    expect(diffDays).toBeLessThan(90.5);
  });

  it("getClientAnalytics agrupa serviceMetrics por serviceId correctamente", async () => {
    const jobs = [
      { status: "completed", service_id: "seo_premium", duration_ms: 1000, created_at: "2026-05-01T00:00:00.000Z" },
      { status: "failed", service_id: "seo_premium", duration_ms: 2000, created_at: "2026-05-02T00:00:00.000Z" },
      { status: "completed", service_id: "ads_premium", duration_ms: 3000, created_at: "2026-05-03T00:00:00.000Z" },
    ];
    const assets = [
      { id: "a1", service_id: "seo_premium" },
      { id: "a2", service_id: "ads_premium" },
      { id: "a3", service_id: "ads_premium" },
    ];
    const query = vi.fn().mockResolvedValueOnce(jobs).mockResolvedValueOnce(assets).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    const out = await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa");
    expect(out.serviceMetrics).toHaveLength(2);
    const seo = out.serviceMetrics.find((m) => m.serviceId === "seo_premium");
    const ads = out.serviceMetrics.find((m) => m.serviceId === "ads_premium");
    expect(seo?.jobsTotal).toBe(2);
    expect(ads?.assetsGenerated).toBe(2);
  });

  it("getClientAnalytics monthlyTrend tiene estructura correcta", async () => {
    const trend = [{ month: "2026-03", jobs: "3" }, { month: "2026-04", jobs: "5" }];
    const assetTrend = [{ month: "2026-03", assets: "2" }, { month: "2026-04", assets: "8" }];
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce(trend).mockResolvedValueOnce(assetTrend);
    const svc = new SaasAnalyticsService({ db: { query } });
    const out = await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa");
    expect(out.monthlyTrend).toEqual([
      { month: "2026-03", jobs: 3, assets: 2 },
      { month: "2026-04", jobs: 5, assets: 8 },
    ]);
  });

  it("getClientAnalytics no devuelve datos de otro usuario", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    await svc.getClientAnalytics("otro", "00000000-0000-0000-0000-0000000000aa");
    const firstArgs = query.mock.calls[0]?.[1] as unknown[];
    expect(firstArgs[0]).toBe("otro");
  });

  it("getClientAnalytics calcula avgDurationMs por servicio", async () => {
    const jobs = [
      { status: "completed", service_id: "seo_premium", duration_ms: 1000, created_at: "2026-05-01T00:00:00.000Z" },
      { status: "completed", service_id: "seo_premium", duration_ms: 3000, created_at: "2026-05-02T00:00:00.000Z" },
    ];
    const query = vi.fn().mockResolvedValueOnce(jobs).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    const out = await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa");
    expect(out.serviceMetrics[0]?.avgDurationMs).toBe(2000);
  });

  it("getClientAnalytics calcula lastRunAt por servicio", async () => {
    const jobs = [
      { status: "completed", service_id: "seo_premium", duration_ms: 1000, created_at: "2026-05-01T00:00:00.000Z" },
      { status: "completed", service_id: "seo_premium", duration_ms: 1000, created_at: "2026-05-10T00:00:00.000Z" },
    ];
    const query = vi.fn().mockResolvedValueOnce(jobs).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    const out = await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa");
    expect(out.serviceMetrics[0]?.lastRunAt).toBe("2026-05-10T00:00:00.000Z");
  });

  it("getClientAnalytics servicio sin assets reporta assetsGenerated=0", async () => {
    const jobs = [{ status: "completed", service_id: "seo_premium", duration_ms: 1000, created_at: "2026-05-01T00:00:00.000Z" }];
    const query = vi.fn().mockResolvedValueOnce(jobs).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasAnalyticsService({ db: { query } });
    const out = await svc.getClientAnalytics("u1", "00000000-0000-0000-0000-0000000000aa");
    expect(out.serviceMetrics[0]?.assetsGenerated).toBe(0);
  });

  it("saasAnalyticsService singleton es instancia de SaasAnalyticsService", () => {
    expect(saasAnalyticsService).toBeInstanceOf(SaasAnalyticsService);
  });
});
