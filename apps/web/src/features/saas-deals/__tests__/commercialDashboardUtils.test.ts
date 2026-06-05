import { describe, expect, it } from "vitest";

import {
  buildStageDistribution,
  hasCommercialPipelineData,
  takeOpenDeals,
  takeRecentWonDeals,
} from "../commercialDashboardUtils";
import type { SaasDeal, SaasDealsMetrics } from "../types";

const baseMetrics: SaasDealsMetrics = {
  openCount: 2,
  wonCount: 1,
  lostCount: 0,
  pipelineValue: 5000,
  wonValue: 2000,
  forecastValue: 3500,
  currency: "EUR",
  byStage: [
    { stage: "new", count: 1, totalValue: 3000, conversionToWonPct: null },
    { stage: "contacted", count: 0, totalValue: 0, conversionToWonPct: null },
    { stage: "qualified", count: 1, totalValue: 2000, conversionToWonPct: null },
    { stage: "proposal", count: 0, totalValue: 0, conversionToWonPct: null },
    { stage: "won", count: 1, totalValue: 2000, conversionToWonPct: 100 },
    { stage: "lost", count: 0, totalValue: 0, conversionToWonPct: null },
  ],
};

function deal(partial: Partial<SaasDeal> & Pick<SaasDeal, "id" | "title" | "stage" | "updatedAt">): SaasDeal {
  return {
    tenantId: "t1",
    contactId: null,
    value: 1000,
    currency: "EUR",
    probability: 50,
    expectedCloseDate: null,
    source: null,
    ownerUserId: null,
    notes: null,
    createdAt: partial.updatedAt,
    ...partial,
  };
}

describe("commercialDashboardUtils", () => {
  it("detects when pipeline has commercial data", () => {
    expect(hasCommercialPipelineData(baseMetrics)).toBe(true);
    expect(
      hasCommercialPipelineData({
        ...baseMetrics,
        byStage: baseMetrics.byStage.map((row) => ({ ...row, count: 0, totalValue: 0 })),
      }),
    ).toBe(false);
  });

  it("builds stage distribution with share percentages", () => {
    const rows = buildStageDistribution(baseMetrics, (s) => s);
    expect(rows.find((r) => r.stage === "new")?.sharePct).toBe(33.3);
    expect(rows.find((r) => r.stage === "won")?.count).toBe(1);
  });

  it("lists open and recently won deals", () => {
    const deals = [
      deal({ id: "1", title: "Open A", stage: "new", updatedAt: "2026-06-01T10:00:00Z" }),
      deal({ id: "2", title: "Won old", stage: "won", updatedAt: "2026-05-01T10:00:00Z" }),
      deal({ id: "3", title: "Won new", stage: "won", updatedAt: "2026-06-04T10:00:00Z" }),
      deal({ id: "4", title: "Lost", stage: "lost", updatedAt: "2026-06-03T10:00:00Z" }),
    ];

    expect(takeOpenDeals(deals).map((d) => d.id)).toEqual(["1"]);
    expect(takeRecentWonDeals(deals).map((d) => d.id)).toEqual(["3", "2"]);
  });
});
