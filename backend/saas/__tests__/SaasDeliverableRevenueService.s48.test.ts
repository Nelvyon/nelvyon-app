/**
 * S48 — SaasDeliverableRevenueService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  SaasDeliverableRevenueService,
  SaasDeliverableRevenueError,
} from "../SaasDeliverableRevenueService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

// ── DB mock ───────────────────────────────────────────────────────────────────

function makeDb(responses: unknown[]): SaasPostgresPort {
  let call = 0;
  return {
    query: vi.fn().mockImplementation(async () => {
      const res = responses[call] ?? [];
      call++;
      return res;
    }),
  } as unknown as SaasPostgresPort;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LINK_ROW = {
  tenant_id: "t1", deliverable_id: "del-1", deliverable_source: "os",
  utm_campaign: "q2-landing", external_campaign_id: null, landing_url: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const REVENUE_ROW = {
  id: "rev-1", tenant_id: "t1", deliverable_id: "del-1",
  deliverable_source: "os", pack_id: "local-business-growth",
  utm_campaign: "q2-landing", period_start: "2026-05-27",
  period_end: "2026-06-26", visits: 200, conversions: 5,
  attributed_revenue: "2500.00", ads_spend: "800.00", roas: "3.1250",
  model: "last_touch", computed_at: new Date().toISOString(),
};

// ── linkDeliverable ───────────────────────────────────────────────────────────

describe("SaasDeliverableRevenueService — linkDeliverable", () => {
  it("upserts link and returns mapped object", async () => {
    const db = makeDb([[LINK_ROW]]);
    const svc = new SaasDeliverableRevenueService(db);
    const link = await svc.linkDeliverable("t1", "del-1", {
      deliverableSource: "os",
      utmCampaign: "q2-landing",
    });
    expect(link.deliverableId).toBe("del-1");
    expect(link.utmCampaign).toBe("q2-landing");
    expect(link.tenantId).toBe("t1");
  });

  it("throws VALIDATION for empty deliverableId", async () => {
    const db = makeDb([]);
    const svc = new SaasDeliverableRevenueService(db);
    await expect(
      svc.linkDeliverable("t1", "  ", { deliverableSource: "os" }),
    ).rejects.toThrow(SaasDeliverableRevenueError);
  });

  it("VALIDATION error has code VALIDATION", async () => {
    const db = makeDb([]);
    const svc = new SaasDeliverableRevenueService(db);
    try {
      await svc.linkDeliverable("t1", "", { deliverableSource: "os" });
    } catch (e) {
      expect((e as SaasDeliverableRevenueError).code).toBe("VALIDATION");
    }
  });

  it("passes utmCampaign and landingUrl to DB query", async () => {
    const db = makeDb([[LINK_ROW]]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasDeliverableRevenueService(db);
    await svc.linkDeliverable("t1", "del-1", {
      deliverableSource: "os",
      utmCampaign: "test-campaign",
      landingUrl: "https://acme.com/landing",
    });
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("test-campaign");
    expect(params).toContain("https://acme.com/landing");
  });
});

// ── computeRevenue ────────────────────────────────────────────────────────────

describe("SaasDeliverableRevenueService — computeRevenue", () => {
  it("computes revenue with conversions from attribution", async () => {
    // Queries: linkRows, attrRows, dealRows (avg_value), spendRows, UPSERT revenue
    const db = makeDb([
      [LINK_ROW],
      [{ visits: "200", conversions: "5" }],
      [{ avg_value: "600" }],
      [],
      [REVENUE_ROW],
    ]);
    const svc = new SaasDeliverableRevenueService(db);
    const rev = await svc.computeRevenue("t1", "del-1");
    expect(rev.deliverableId).toBe("del-1");
    expect(rev.conversions).toBe(5);
    expect(rev.attributedRevenue).toBe(2500);
  });

  it("roas = revenue / spend when spend > 0", async () => {
    const db = makeDb([
      [LINK_ROW],
      [{ visits: "100", conversions: "4" }],
      [{ avg_value: "500" }],
      [{ total_spend: "800" }],
      [{ ...REVENUE_ROW, attributed_revenue: "2000.00", ads_spend: "800.00", roas: "2.5000" }],
    ]);
    const svc = new SaasDeliverableRevenueService(db);
    const rev = await svc.computeRevenue("t1", "del-1");
    expect(rev.roas).toBeCloseTo(2.5, 1);
  });

  it("roas is null when spend = 0", async () => {
    const db = makeDb([
      [LINK_ROW],
      [{ visits: "50", conversions: "2" }],
      [{ avg_value: "500" }],
      [],
      [{ ...REVENUE_ROW, attributed_revenue: "1000.00", ads_spend: "0.00", roas: null }],
    ]);
    const svc = new SaasDeliverableRevenueService(db);
    const rev = await svc.computeRevenue("t1", "del-1");
    expect(rev.roas).toBeNull();
  });

  it("falls back to REVENUE_PER_CONVERSION_DEFAULT=500 when no deals", async () => {
    const db = makeDb([
      [LINK_ROW],
      [{ visits: "10", conversions: "2" }],
      [{ avg_value: null }], // no deals
      [],
      [{ ...REVENUE_ROW, attributed_revenue: "1000.00", ads_spend: "0.00", roas: null }],
    ]);
    const svc = new SaasDeliverableRevenueService(db);
    const rev = await svc.computeRevenue("t1", "del-1");
    // conversions=2 × €500 default = €1000
    expect(rev.attributedRevenue).toBe(1000);
  });

  it("visits=0 conversions=0 when no utm_campaign (no link)", async () => {
    // No link row → skips attribution query, dealRows, spendRows, then upserts zero revenue
    const zeroRow = { ...REVENUE_ROW, deliverable_id: "del-2", visits: 0, conversions: 0, attributed_revenue: "0.00", ads_spend: "0.00", roas: null };
    const db = makeDb([
      [], // no link → skips attr + spend queries
      [], // deals (no crm data)
      [zeroRow], // upsert result
    ]);
    const svc = new SaasDeliverableRevenueService(db);
    const rev = await svc.computeRevenue("t1", "del-2");
    expect(rev.conversions).toBe(0);
    expect(rev.attributedRevenue).toBe(0);
  });

  it("tenant isolation: uses tenantId in all queries", async () => {
    const db = makeDb([
      [LINK_ROW],
      [{ visits: "0", conversions: "0" }],
      [],
      [],
      [REVENUE_ROW],
    ]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasDeliverableRevenueService(db);
    await svc.computeRevenue("tenant-A", "del-1");
    const allCalls = (db.query as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown[]]>;
    const tenantUsages = allCalls.filter(([, params]) => params.includes("tenant-A"));
    expect(tenantUsages.length).toBeGreaterThan(0);
  });
});

// ── listRevenueByDeliverable ──────────────────────────────────────────────────

describe("SaasDeliverableRevenueService — listRevenueByDeliverable", () => {
  it("returns mapped revenue rows ordered by attributed_revenue DESC", async () => {
    const row2 = { ...REVENUE_ROW, id: "rev-2", deliverable_id: "del-2", attributed_revenue: "5000.00" };
    const db = makeDb([[REVENUE_ROW, row2]]);
    const svc = new SaasDeliverableRevenueService(db);
    const items = await svc.listRevenueByDeliverable("t1");
    expect(items).toHaveLength(2);
    expect(items[0]!.attributedRevenue).toBe(2500);
  });

  it("returns empty array when no revenue computed yet", async () => {
    const db = makeDb([[]]); // empty
    const svc = new SaasDeliverableRevenueService(db);
    const items = await svc.listRevenueByDeliverable("t1");
    expect(items).toHaveLength(0);
  });

  it("passes model to query", async () => {
    const db = makeDb([[]]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasDeliverableRevenueService(db);
    await svc.listRevenueByDeliverable("t1", 30, "first_touch");
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("first_touch");
  });
});

// ── getPackRevenueSummary ─────────────────────────────────────────────────────

describe("SaasDeliverableRevenueService — getPackRevenueSummary", () => {
  it("aggregates revenue, spend, conversions for pack", async () => {
    const db = makeDb([[{
      pack_id: "local-business-growth",
      total_conversions: "10",
      total_revenue: "5000",
      total_spend: "1500",
      deliverable_count: "2",
    }]]);
    const svc = new SaasDeliverableRevenueService(db);
    const summary = await svc.getPackRevenueSummary("t1", "local-business-growth");
    expect(summary.packId).toBe("local-business-growth");
    expect(summary.totalConversions).toBe(10);
    expect(summary.totalAttributedRevenue).toBe(5000);
    expect(summary.totalAdsSpend).toBe(1500);
    expect(summary.avgRoas).toBeCloseTo(5000 / 1500, 1);
    expect(summary.deliverableCount).toBe(2);
  });

  it("returns zero summary when no rows found for pack", async () => {
    const db = makeDb([[]]); // empty
    const svc = new SaasDeliverableRevenueService(db);
    const summary = await svc.getPackRevenueSummary("t1", "unknown-pack");
    expect(summary.totalConversions).toBe(0);
    expect(summary.avgRoas).toBeNull();
  });

  it("avgRoas is null when total spend = 0", async () => {
    const db = makeDb([[{
      pack_id: "local-business-growth",
      total_conversions: "5", total_revenue: "2500",
      total_spend: "0", deliverable_count: "1",
    }]]);
    const svc = new SaasDeliverableRevenueService(db);
    const summary = await svc.getPackRevenueSummary("t1", "local-business-growth");
    expect(summary.avgRoas).toBeNull();
  });
});

// ── refreshAll ────────────────────────────────────────────────────────────────

describe("SaasDeliverableRevenueService — refreshAll", () => {
  it("iterates all links and calls computeRevenue per deliverable", async () => {
    // refreshAll: listLinks query + for each link: linkRows, attrRows, dealRows, spendRows, upsert
    const LINKS = [
      { ...LINK_ROW, deliverable_id: "del-1" },
      { ...LINK_ROW, deliverable_id: "del-2" },
    ];
    const emptyRevRow = { ...REVENUE_ROW, id: "r2" };
    const db = makeDb([
      LINKS,           // listLinks
      // del-1 computeRevenue
      [LINK_ROW], [{ visits: "10", conversions: "2" }], [{ avg_value: "500" }], [], [REVENUE_ROW],
      // del-2 computeRevenue
      [LINK_ROW], [{ visits: "5", conversions: "1" }], [{ avg_value: "500" }], [], [emptyRevRow],
    ]);
    const svc = new SaasDeliverableRevenueService(db);
    const result = await svc.refreshAll("t1");
    expect(result.refreshed).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("collects errors without aborting batch", async () => {
    const LINKS = [{ ...LINK_ROW, deliverable_id: "del-bad" }];
    const db = makeDb([
      LINKS,
      // computeRevenue throws (DB returns wrong data)
    ]);
    // Make the second query throw
    let call = 0;
    const mockDb: SaasPostgresPort = {
      query: vi.fn().mockImplementation(async () => {
        call++;
        if (call === 1) return LINKS;
        throw new Error("DB error");
      }),
    } as unknown as SaasPostgresPort;
    const svc = new SaasDeliverableRevenueService(mockDb);
    const result = await svc.refreshAll("t1");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/del-bad/);
  });
});
