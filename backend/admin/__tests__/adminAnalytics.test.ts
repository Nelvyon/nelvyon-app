import { describe, expect, it, vi } from "vitest";

import { AdminAnalyticsService } from "../AdminAnalyticsService";

describe("AdminAnalyticsService", () => {
  it("getMRR con datos", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("COALESCE(SUM(amount_eur), 0)::text AS mrr") && !sql.includes("created_at <")) return [{ mrr: "1200" }];
      if (sql.includes("created_at < date_trunc('month', NOW())")) return [{ mrr: "1000" }];
      if (sql.includes("COUNT(*)::text AS count") && sql.includes("os_service_contracts")) return [{ count: "8" }];
      return [];
    });
    const svc = new AdminAnalyticsService({ db: { query } });
    const out = await svc.getMRR();
    expect(out.mrr).toBe(1200);
    expect(out.activeSubscriptions).toBe(8);
    expect(out.mrrGrowth).toBeCloseTo(20, 5);
  });

  it("getChurn calcula ratio", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("status = 'churned'")) return [{ count: "5" }];
      if (sql.includes("status = 'client'")) return [{ count: "100" }];
      return [];
    });
    const svc = new AdminAnalyticsService({ db: { query } });
    const out = await svc.getChurn();
    expect(out.cancelledLast30Days).toBe(5);
    expect(out.totalActive).toBe(100);
    expect(out.churnRate).toBeCloseTo(5, 5);
  });

  it("getLTV calcula avgRevenuePerUser y avgLTV", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("COALESCE(SUM(amount_eur), 0)::text AS mrr") && !sql.includes("created_at <")) return [{ mrr: "900" }];
      if (sql.includes("created_at < date_trunc('month', NOW())")) return [{ mrr: "600" }];
      if (sql.includes("COUNT(*)::text AS count") && sql.includes("os_service_contracts")) return [{ count: "3" }];
      if (sql.includes("SELECT plan FROM nelvyon_users")) return [{ plan: "starter" }, { plan: "pro" }, { plan: "free" }];
      return [];
    });
    const svc = new AdminAnalyticsService({ db: { query } });
    const out = await svc.getLTV();
    expect(out.avgRevenuePerUser).toBe(450);
    expect(out.avgLifespanMonths).toBe(18);
    expect(out.avgLTV).toBe(8100);
  });

  it("getTopServices devuelve top con successRate", async () => {
    const query = vi.fn().mockResolvedValue([
      { service_type: "seo_premium", total_jobs: "40", success_rate: "95" },
      { service_type: "ads_premium", total_jobs: "20", success_rate: "75" },
    ]);
    const svc = new AdminAnalyticsService({ db: { query } });
    const out = await svc.getTopServices();
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ serviceType: "seo_premium", totalJobs: 40, successRate: 95 });
  });

  it("getDashboard usa Promise.all y combina métricas", async () => {
    const svc = new AdminAnalyticsService({ db: { query: vi.fn() } });
    const mrrSpy = vi.spyOn(svc, "getMRR").mockResolvedValue({ mrr: 100, mrrGrowth: 10, activeSubscriptions: 2 });
    const churnSpy = vi.spyOn(svc, "getChurn").mockResolvedValue({ churnRate: 5, cancelledLast30Days: 1, totalActive: 20 });
    const ltvSpy = vi.spyOn(svc, "getLTV").mockResolvedValue({ avgLTV: 1200, avgRevenuePerUser: 100, avgLifespanMonths: 12 });
    const topSpy = vi.spyOn(svc, "getTopServices").mockResolvedValue([{ serviceType: "seo", totalJobs: 10, successRate: 90 }]);
    const out = await svc.getDashboard();
    expect(mrrSpy).toHaveBeenCalledTimes(1);
    expect(churnSpy).toHaveBeenCalledTimes(1);
    expect(ltvSpy).toHaveBeenCalledTimes(1);
    expect(topSpy).toHaveBeenCalledTimes(1);
    expect(out.topServices).toHaveLength(1);
  });

  it("refreshCache guarda dashboard en admin_metrics_cache", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new AdminAnalyticsService({ db: { query } });
    vi.spyOn(svc, "getDashboard").mockResolvedValue({
      mrr: { mrr: 500, mrrGrowth: 0, activeSubscriptions: 5 },
      churn: { churnRate: 4, cancelledLast30Days: 2, totalActive: 50 },
      ltv: { avgLTV: 3000, avgRevenuePerUser: 250, avgLifespanMonths: 12 },
      topServices: [{ serviceType: "seo", totalJobs: 100, successRate: 98 }],
    });
    await svc.refreshCache();
    const insertCall = query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO admin_metrics_cache"));
    expect(insertCall).toBeDefined();
    expect(String(insertCall?.[0])).toContain("$1::jsonb");
  });
});
