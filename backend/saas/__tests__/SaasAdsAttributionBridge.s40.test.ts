/**
 * S40 — SaasAdsDashboardService: campaign linking + attributed ROAS bridge
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasAdsDashboardService, SaasAdsDashboardError } from "../SaasAdsDashboardService";

type Row = Record<string, unknown>;

function makeDb(responses: Row[][]): { query: ReturnType<typeof vi.fn> } {
  let call = 0;
  return { query: vi.fn(async () => responses[call++] ?? []) };
}

const TENANT = "tenant-bridge";
const LINK_ROW: Row = {
  id: "link-1", tenant_id: TENANT, platform: "meta",
  external_campaign_id: "camp-123", external_campaign_name: "Summer Campaign",
  utm_campaign: "summer_2026", utm_source: "meta", utm_medium: "cpc",
  created_at: new Date(),
};

describe("SaasAdsDashboardService.linkCampaign", () => {
  it("inserts a campaign link and returns typed result", async () => {
    const db = makeDb([[LINK_ROW]]);
    const svc = new SaasAdsDashboardService(db as never);
    const result = await svc.linkCampaign(TENANT, {
      platform: "meta",
      externalCampaignId: "camp-123",
      externalCampaignName: "Summer Campaign",
      utmCampaign: "summer_2026",
      utmSource: "meta",
      utmMedium: "cpc",
    });
    expect(result.id).toBe("link-1");
    expect(result.tenantId).toBe(TENANT);
    expect(result.platform).toBe("meta");
    expect(result.externalCampaignId).toBe("camp-123");
    expect(result.utmCampaign).toBe("summer_2026");
    expect(result.utmSource).toBe("meta");
    expect(result.createdAt).toBeTypeOf("string");
  });

  it("throws VALIDATION if externalCampaignId missing", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db as never);
    await expect(svc.linkCampaign(TENANT, { platform: "meta", externalCampaignId: "", utmCampaign: "x" }))
      .rejects.toThrow(SaasAdsDashboardError);
  });

  it("throws VALIDATION if utmCampaign missing", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db as never);
    await expect(svc.linkCampaign(TENANT, { platform: "meta", externalCampaignId: "x", utmCampaign: "" }))
      .rejects.toThrow(SaasAdsDashboardError);
  });

  it("uses ON CONFLICT upsert (SQL contains DO UPDATE)", async () => {
    const db = makeDb([[LINK_ROW]]);
    const svc = new SaasAdsDashboardService(db as never);
    await svc.linkCampaign(TENANT, { platform: "meta", externalCampaignId: "c1", utmCampaign: "camp" });
    const sql: string = db.query.mock.calls[0][0];
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("DO UPDATE");
  });

  it("passes null for optional fields when not provided", async () => {
    const db = makeDb([[{ ...LINK_ROW, external_campaign_name: null, utm_source: null, utm_medium: null }]]);
    const svc = new SaasAdsDashboardService(db as never);
    const result = await svc.linkCampaign(TENANT, { platform: "google", externalCampaignId: "g1", utmCampaign: "camp_g" });
    expect(result.externalCampaignName).toBeNull();
    expect(result.utmSource).toBeNull();
    expect(result.utmMedium).toBeNull();
  });
});

describe("SaasAdsDashboardService.listCampaignLinks", () => {
  it("returns all links for tenant ordered by created_at DESC", async () => {
    const rows = [LINK_ROW, { ...LINK_ROW, id: "link-2", external_campaign_id: "camp-456" }];
    const db = makeDb([rows]);
    const svc = new SaasAdsDashboardService(db as never);
    const links = await svc.listCampaignLinks(TENANT);
    expect(links).toHaveLength(2);
    expect(links[0].id).toBe("link-1");
    expect(links[1].id).toBe("link-2");
  });

  it("returns empty array if no links", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db as never);
    expect(await svc.listCampaignLinks(TENANT)).toHaveLength(0);
  });
});

describe("SaasAdsDashboardService.getAttributedRoas", () => {
  it("returns empty array if no campaign links", async () => {
    // listCampaignLinks → []
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db as never);
    const result = await svc.getAttributedRoas(TENANT, 30, "linear");
    expect(result).toHaveLength(0);
  });

  it("returns roas rows with correct model field", async () => {
    const links = [LINK_ROW];
    const spendRows = [{ platform: "meta", total_spend: "500.00" }];
    // attribution events: one contact with one touchpoint utm_campaign=summer_2026, one conversion
    const attrRows: Row[] = [
      { contact_id: "c1", utm_source: "meta", utm_medium: "cpc", utm_campaign: "summer_2026", event_type: "visit",       created_at: new Date(Date.now() - 3600_000).toISOString() },
      { contact_id: "c1", utm_source: "meta", utm_medium: "cpc", utm_campaign: "summer_2026", event_type: "conversion",  created_at: new Date().toISOString() },
    ];
    const db = makeDb([links, spendRows, attrRows]);
    const svc = new SaasAdsDashboardService(db as never);
    const result = await svc.getAttributedRoas(TENANT, 30, "linear");
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe("linear");
    expect(result[0].link.utmCampaign).toBe("summer_2026");
    expect(result[0].spend).toBe(500);
    expect(result[0].attributedConversions).toBe(1);
    expect(result[0].attributedRoas).not.toBeNull();
  });

  it("returns null roas when spend is zero", async () => {
    const links = [LINK_ROW];
    const spendRows: Row[] = []; // no spend cached
    const attrRows: Row[] = [
      { contact_id: "c1", utm_source: "meta", utm_medium: "cpc", utm_campaign: "summer_2026", event_type: "visit",      created_at: new Date(Date.now() - 3600_000).toISOString() },
      { contact_id: "c1", utm_source: "meta", utm_medium: "cpc", utm_campaign: "summer_2026", event_type: "conversion", created_at: new Date().toISOString() },
    ];
    const db = makeDb([links, spendRows, attrRows]);
    const svc = new SaasAdsDashboardService(db as never);
    const result = await svc.getAttributedRoas(TENANT, 30, "first_touch");
    expect(result[0].spend).toBe(0);
    expect(result[0].attributedRoas).toBeNull();
  });

  it("returns null roas when no attributed conversions", async () => {
    const links = [LINK_ROW];
    const spendRows = [{ platform: "meta", total_spend: "200" }];
    const attrRows: Row[] = []; // no attribution data
    const db = makeDb([links, spendRows, attrRows]);
    const svc = new SaasAdsDashboardService(db as never);
    const result = await svc.getAttributedRoas(TENANT, 30, "linear");
    expect(result[0].attributedConversions).toBe(0);
    expect(result[0].attributedRoas).toBeNull();
  });

  it("correctly calculates ROAS as conversions / spend", async () => {
    const links = [LINK_ROW];
    const spendRows = [{ platform: "meta", total_spend: "100" }];
    // 2 contacts, each converts once via summer_2026
    const attrRows: Row[] = [
      { contact_id: "c1", utm_source: "meta", utm_medium: "cpc", utm_campaign: "summer_2026", event_type: "visit",      created_at: new Date(Date.now() - 7200_000).toISOString() },
      { contact_id: "c1", utm_source: "meta", utm_medium: "cpc", utm_campaign: "summer_2026", event_type: "conversion", created_at: new Date(Date.now() - 3600_000).toISOString() },
      { contact_id: "c2", utm_source: "meta", utm_medium: "cpc", utm_campaign: "summer_2026", event_type: "visit",      created_at: new Date(Date.now() - 3000_000).toISOString() },
      { contact_id: "c2", utm_source: "meta", utm_medium: "cpc", utm_campaign: "summer_2026", event_type: "conversion", created_at: new Date().toISOString() },
    ];
    const db = makeDb([links, spendRows, attrRows]);
    const svc = new SaasAdsDashboardService(db as never);
    const result = await svc.getAttributedRoas(TENANT, 30, "first_touch");
    // 2 conversions / 100 spend = 0.02
    expect(result[0].attributedConversions).toBe(2);
    expect(result[0].attributedRoas).toBeCloseTo(0.02, 3);
  });

  it("handles multiple platforms in spend data", async () => {
    const googleLink: Row = { ...LINK_ROW, id: "link-g", platform: "google", external_campaign_id: "g1", utm_campaign: "camp_google" };
    const links = [LINK_ROW, googleLink];
    const spendRows = [
      { platform: "meta",   total_spend: "300" },
      { platform: "google", total_spend: "150" },
    ];
    const db = makeDb([links, spendRows, []]); // no attr events
    const svc = new SaasAdsDashboardService(db as never);
    const result = await svc.getAttributedRoas(TENANT, 30, "linear");
    expect(result).toHaveLength(2);
    const metaRow = result.find(r => r.link.platform === "meta");
    const googleRow = result.find(r => r.link.platform === "google");
    expect(metaRow?.spend).toBe(300);
    expect(googleRow?.spend).toBe(150);
  });
});
