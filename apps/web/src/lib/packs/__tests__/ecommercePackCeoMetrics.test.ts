import { describe, expect, it } from "vitest";
import { buildEcommercePackCeoMetrics } from "@/lib/packs/ecommercePackCeoMetrics";

describe("buildEcommercePackCeoMetrics", () => {
  it("returns 5 metric keys", () => {
    const result = buildEcommercePackCeoMetrics({
      orders: 120,
      revenueEur: 6000,
      cartVisits: 800,
      cartCheckouts: 200,
      adsSpendEur: 1200,
      adsSpendAvailable: true,
    });
    expect(result.metrics).toHaveLength(5);
    const keys = result.metrics.map((m) => m.key);
    expect(keys).toContain("orders");
    expect(keys).toContain("revenue_eur");
    expect(keys).toContain("aov_eur");
    expect(keys).toContain("cart_abandonment_rate");
    expect(keys).toContain("roas_approx");
  });

  it("calculates AOV correctly", () => {
    const result = buildEcommercePackCeoMetrics({
      orders: 100,
      revenueEur: 5000,
      cartVisits: null,
      cartCheckouts: null,
      adsSpendEur: null,
      adsSpendAvailable: false,
    });
    const aov = result.metrics.find((m) => m.key === "aov_eur")!;
    expect(aov.available).toBe(true);
    expect(aov.value).toContain("50");
  });

  it("calculates cart abandonment rate", () => {
    const result = buildEcommercePackCeoMetrics({
      orders: null,
      revenueEur: null,
      cartVisits: 1000,
      cartCheckouts: 250,
      adsSpendEur: null,
      adsSpendAvailable: false,
    });
    const abandon = result.metrics.find((m) => m.key === "cart_abandonment_rate")!;
    expect(abandon.available).toBe(true);
    expect(abandon.value).toBe("75%");
  });

  it("calculates ROAS", () => {
    const result = buildEcommercePackCeoMetrics({
      orders: 50,
      revenueEur: 10000,
      cartVisits: null,
      cartCheckouts: null,
      adsSpendEur: 2000,
      adsSpendAvailable: true,
    });
    const roas = result.metrics.find((m) => m.key === "roas_approx")!;
    expect(roas.available).toBe(true);
    expect(roas.value).toBe("5.0x");
  });

  it("marks metrics unavailable when data missing", () => {
    const result = buildEcommercePackCeoMetrics({
      orders: null,
      revenueEur: null,
      cartVisits: null,
      cartCheckouts: null,
      adsSpendEur: null,
      adsSpendAvailable: false,
    });
    expect(result.degraded).toBe(true);
    expect(result.metrics.every((m) => !m.available)).toBe(true);
  });

  it("includes fetched_at and period_days", () => {
    const result = buildEcommercePackCeoMetrics({ orders: null, revenueEur: null, cartVisits: null, cartCheckouts: null, adsSpendEur: null, adsSpendAvailable: false }, 60);
    expect(result.period_days).toBe(60);
    expect(result.fetched_at).toBeTruthy();
  });
});
