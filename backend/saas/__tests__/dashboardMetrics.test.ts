// @ts-nocheck
import { describe, expect, it, vi } from "vitest";

import { DashboardMetricsService } from "../DashboardMetricsService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";

describe("DashboardMetricsService", () => {
  it("getROIMetrics", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ date: "2026-05-01", revenue: "1000" }])
      .mockResolvedValueOnce([{ date: "2026-05-01", spend: "400" }]);
    const svc = new DashboardMetricsService({ db: { query }, ga4Service: { runReport: vi.fn() } as never });
    const out = await svc.getROIMetrics(USER_ID);
    expect(out).toHaveLength(1);
    expect(out[0].roi).toBe(150);
  });

  it("getTrafficMetrics", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([]) // ga4 creds
      .mockResolvedValueOnce([{ date: "2026-05-01", sessions: "20", users: "20", conversions: "3" }]);
    const svc = new DashboardMetricsService({ db: { query }, ga4Service: { runReport: vi.fn() } as never });
    const out = await svc.getTrafficMetrics(USER_ID);
    expect(out[0].sessions).toBe(20);
    expect(out[0].conversions).toBe(3);
  });

  it("getConversionMetrics", async () => {
    const query = vi.fn().mockResolvedValue([
      { name: "purchase", value: "6" },
      { name: "lead", value: "4" },
    ]);
    const svc = new DashboardMetricsService({ db: { query }, ga4Service: { runReport: vi.fn() } as never });
    const out = await svc.getConversionMetrics(USER_ID);
    expect(out).toHaveLength(2);
    expect(out[0].percentage).toBe(60);
  });

  it("getMRRMetrics", async () => {
    const query = vi.fn().mockResolvedValue([
      { month: "2026-04", mrr: "1000" },
      { month: "2026-05", mrr: "1200" },
    ]);
    const svc = new DashboardMetricsService({ db: { query }, ga4Service: { runReport: vi.fn() } as never });
    const out = await svc.getMRRMetrics(USER_ID, 6);
    expect(out[1].growth).toBe(20);
  });

  it("getDashboardSummary", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ date: "2026-05-01", revenue: "500" }])
      .mockResolvedValueOnce([{ date: "2026-05-01", spend: "250" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ date: "2026-05-01", sessions: "10", users: "10", conversions: "1" }])
      .mockResolvedValueOnce([{ name: "purchase", value: "1" }])
      .mockResolvedValueOnce([{ month: "2026-05", mrr: "500" }]);
    const svc = new DashboardMetricsService({ db: { query }, ga4Service: { runReport: vi.fn() } as never });
    const out = await svc.getDashboardSummary(USER_ID);
    expect(out.roi.length).toBeGreaterThan(0);
    expect(Array.isArray(out.traffic)).toBe(true);
    expect(Array.isArray(out.conversions)).toBe(true);
    expect(Array.isArray(out.mrr)).toBe(true);
  });
});
