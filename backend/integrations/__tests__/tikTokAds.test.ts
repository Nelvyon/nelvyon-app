// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetTikTokAdsServiceForTests, TikTokAdsService } from "../TikTokAdsService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function credRow() {
  return [
    {
      user_id: UID,
      advertiser_id: "ADV999",
      access_token: "TT_TOKEN",
      is_active: true,
    },
  ];
}

function mockDbReads() {
  return vi.fn((sql: string) => {
    if (sql.includes("integration_tiktok_ads") && sql.includes("SELECT")) return Promise.resolve(credRow());
    return Promise.resolve([]);
  });
}

function buildFetchMock() {
  return vi.fn().mockImplementation((input: string | URL, init?: RequestInit) => {
    const url = String(input);
    let payload: Record<string, unknown>;

    if (url.includes("/campaign/get/")) {
      payload = {
        code: 0,
        message: "OK",
        data: {
          list: [
            {
              campaign_id: "111",
              campaign_name: "Summer",
              operation_status: "ENABLE",
              objective_type: "TRAFFIC",
              budget: 250,
            },
          ],
        },
      };
    } else if (url.includes("/report/integrated/get/") && url.includes("AUCTION_CAMPAIGN")) {
      payload = {
        code: 0,
        data: {
          list: [
            {
              campaign_id: "777",
              impressions: 10000,
              clicks: 250,
              spend: 500,
              conversion: 12,
              ctr: 0.025,
              cpc: 2,
            },
          ],
        },
      };
    } else if (url.includes("/report/integrated/get/") && url.includes("AUCTION_ADVERTISER")) {
      payload = {
        code: 0,
        data: {
          list: [
            { impressions: 3000, clicks: 90, spend: 100, conversion: 3 },
            { impressions: 7000, clicks: 210, spend: 400, conversion: 9 },
          ],
        },
      };
    } else if (url.includes("/audience/insights/")) {
      payload = {
        code: 0,
        data: {
          age_breakdown: [{ age_range: "18-24", percentage: 40, count: 400 }],
          gender_breakdown: [{ gender: "female", percentage: 55 }],
          country_breakdown: [{ country_code: "US", percentage: 60 }],
        },
      };
    } else {
      payload = { code: 0, data: { list: [] } };
    }

    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

describe("TikTokAdsService", () => {
  beforeEach(() => {
    resetTikTokAdsServiceForTests();
    vi.stubGlobal("fetch", buildFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetTikTokAdsServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new TikTokAdsService({ db: { query } });
    await svc.saveCredentials(UID, "ADV1", "tok");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_tiktok_ads"), [UID, "ADV1", "tok"]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new TikTokAdsService({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.advertiserId).toBe("ADV999");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new TikTokAdsService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("getCampaigns", async () => {
    const query = mockDbReads();
    const svc = new TikTokAdsService({ db: { query } });
    const camps = await svc.getCampaigns(UID);
    expect(camps[0]?.campaignId).toBe("111");
    expect(camps[0]?.budget).toBe(250);
    const u = globalThis.fetch.mock.calls[0][0] as string;
    expect(u).toContain("/campaign/get/");
    expect(globalThis.fetch.mock.calls[0][1]?.headers?.["Access-Token"]).toBe("TT_TOKEN");
  });

  it("getCampaignMetrics", async () => {
    const query = mockDbReads();
    const svc = new TikTokAdsService({ db: { query } });
    const m = await svc.getCampaignMetrics(UID, "777", { startDate: "2026-01-01", endDate: "2026-01-31" });
    expect(m.campaignId).toBe("777");
    expect(m.impressions).toBe(10000);
    expect(m.conversions).toBe(12);
    expect(m.ctr).toBeCloseTo(250 / 10000);
    const u = globalThis.fetch.mock.calls[0][0] as string;
    expect(u).toContain("/report/integrated/get/");
    expect(u).toContain("AUCTION_CAMPAIGN");
  });

  it("getAccountSummary", async () => {
    const query = mockDbReads();
    const svc = new TikTokAdsService({ db: { query } });
    const s = await svc.getAccountSummary(UID);
    expect(s.impressions).toBe(10000);
    expect(s.clicks).toBe(300);
    expect(s.totalSpend).toBe(500);
    expect(s.conversions).toBe(12);
    const u = globalThis.fetch.mock.calls[0][0] as string;
    expect(u).toContain("AUCTION_ADVERTISER");
  });

  it("getAudienceInsights", async () => {
    const query = mockDbReads();
    const svc = new TikTokAdsService({ db: { query } });
    const i = await svc.getAudienceInsights(UID);
    expect(i.ageBreakdown[0]?.ageRange).toBeTruthy();
    expect(i.genderBreakdown[0]?.gender).toBe("female");
    expect(i.countryBreakdown[0]?.country).toBe("US");
    expect(globalThis.fetch.mock.calls[0][0] as string).toContain("/audience/insights/");
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new TikTokAdsService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_tiktok_ads"), [UID]);
  });
});
