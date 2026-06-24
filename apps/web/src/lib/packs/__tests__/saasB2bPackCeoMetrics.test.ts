import { describe, expect, it } from "vitest";
import { buildSaasB2bPackCeoMetrics } from "@/lib/packs/saasB2bPackCeoMetrics";

describe("buildSaasB2bPackCeoMetrics", () => {
  it("returns 5 metric keys", () => {
    const result = buildSaasB2bPackCeoMetrics({
      trials: 30,
      mrrEur: 12000,
      demos: 50,
      closedDeals: 15,
      churned: 2,
      activeSubscriptions: 80,
      adsSpendEur: 3000,
      adsSpendAvailable: true,
    });
    expect(result.metrics).toHaveLength(5);
    const keys = result.metrics.map((m) => m.key);
    expect(keys).toContain("trials");
    expect(keys).toContain("mrr_eur");
    expect(keys).toContain("cac_approx");
    expect(keys).toContain("demo_close_rate");
    expect(keys).toContain("churn_rate");
  });

  it("calculates demo close rate", () => {
    const result = buildSaasB2bPackCeoMetrics({
      trials: null,
      mrrEur: null,
      demos: 40,
      closedDeals: 10,
      churned: null,
      activeSubscriptions: null,
      adsSpendEur: null,
      adsSpendAvailable: false,
    });
    const rate = result.metrics.find((m) => m.key === "demo_close_rate")!;
    expect(rate.available).toBe(true);
    expect(rate.value).toBe("25%");
  });

  it("calculates CAC from ads + trials", () => {
    const result = buildSaasB2bPackCeoMetrics({
      trials: 30,
      mrrEur: null,
      demos: null,
      closedDeals: null,
      churned: null,
      activeSubscriptions: null,
      adsSpendEur: 6000,
      adsSpendAvailable: true,
    });
    const cac = result.metrics.find((m) => m.key === "cac_approx")!;
    expect(cac.available).toBe(true);
    expect(cac.value).toBe("200 €/trial");
  });

  it("calculates churn rate", () => {
    const result = buildSaasB2bPackCeoMetrics({
      trials: null,
      mrrEur: null,
      demos: null,
      closedDeals: null,
      churned: 5,
      activeSubscriptions: 100,
      adsSpendEur: null,
      adsSpendAvailable: false,
    });
    const churn = result.metrics.find((m) => m.key === "churn_rate")!;
    expect(churn.available).toBe(true);
    expect(churn.value).toBe("5.0%");
  });

  it("is degraded when all data missing", () => {
    const result = buildSaasB2bPackCeoMetrics({
      trials: null, mrrEur: null, demos: null, closedDeals: null,
      churned: null, activeSubscriptions: null, adsSpendEur: null, adsSpendAvailable: false,
    });
    expect(result.degraded).toBe(true);
  });
});
