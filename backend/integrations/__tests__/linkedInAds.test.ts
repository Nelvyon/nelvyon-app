// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LinkedInAdsService, resetLinkedInAdsServiceForTests } from "../LinkedInAdsService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function credRow() {
  return [
    {
      user_id: UID,
      ad_account_id: "111222",
      access_token: "LI_TOKEN",
      refresh_token: "LI_REFRESH",
      token_expiry: new Date(Date.now() + 3_600_000).toISOString(),
      is_active: true,
    },
  ];
}

function mockDbCredentials() {
  return vi.fn((sql: string) => {
    if (sql.includes("integration_linkedin_ads") && sql.includes("SELECT")) return Promise.resolve(credRow());
    return Promise.resolve([]);
  });
}

function buildFetchMock() {
  return vi.fn().mockImplementation((input: string | URL) => {
    const url = String(input);
    let json: Record<string, unknown>;

    if (url.includes("/adCampaignsV2")) {
      json = {
        elements: [
          {
            id: 98765,
            name: "B2B Promo",
            status: "ACTIVE",
            type: "SPONSORED_UPDATES",
            totalBudget: { amount: "500" },
          },
        ],
      };
    } else if (url.includes("/adAnalyticsV2") && url.includes("campaigns=List")) {
      json = {
        elements: [
          {
            impressions: 1200,
            clicks: 48,
            costInUsd: 120,
            oneClickLeads: 5,
            pivotValues: ["urn:li:sponsoredCampaign:777"],
          },
        ],
      };
    } else if (url.includes("/adAnalyticsV2") && url.includes("accounts=List") && url.includes("ACCOUNT")) {
      json = {
        elements: [
          {
            impressions: 9999,
            clicks: 400,
            costInUsd: 900,
            oneClickLeads: 14,
            pivotValues: ["urn:li:sponsoredAccount:111222"],
          },
        ],
      };
    } else if (url.includes("/leadGenForms")) {
      json = {
        elements: [
          { id: 556677, name: "Whitepaper 2026" },
          { id: "urn:li:leadGenForm:998", name: "Webinar" },
        ],
      };
    } else {
      json = { elements: [] };
    }

    return new Response(JSON.stringify(json), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

describe("LinkedInAdsService", () => {
  beforeEach(() => {
    resetLinkedInAdsServiceForTests();
    vi.stubGlobal("fetch", buildFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetLinkedInAdsServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new LinkedInAdsService({ db: { query } });
    await svc.saveCredentials(UID, "urn:li:sponsoredAccount:998877", "at", "rt", new Date("2030-06-01T00:00:00.000Z"));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_linkedin_ads"), [
      UID,
      "998877",
      "at",
      "rt",
      "2030-06-01T00:00:00.000Z",
    ]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new LinkedInAdsService({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.adAccountId).toBe("111222");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new LinkedInAdsService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("getCampaigns", async () => {
    const query = mockDbCredentials();
    const svc = new LinkedInAdsService({ db: { query } });
    const campaigns = await svc.getCampaigns(UID);
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]?.name).toBe("B2B Promo");
    expect(campaigns[0]?.id).toBe("98765");
    const u = globalThis.fetch.mock.calls[0][0] as string;
    expect(u).toContain("/adCampaignsV2?");
    expect(decodeURIComponent(u)).toContain("urn:li:sponsoredAccount:111222");
    expect(globalThis.fetch.mock.calls[0][1]?.headers?.Authorization).toMatch(/^Bearer LI_TOKEN$/);
  });

  it("getCampaignMetrics", async () => {
    const query = mockDbCredentials();
    const svc = new LinkedInAdsService({ db: { query } });
    const m = await svc.getCampaignMetrics(UID, "777", { start: "2026-01-01", end: "2026-01-31" });
    expect(m.impressions).toBe(1200);
    expect(m.clicks).toBe(48);
    expect(m.leads).toBe(5);
    expect(m.campaignId).toBe("777");
    expect(m.ctr).toBeCloseTo(48 / 1200);
    const u = globalThis.fetch.mock.calls[0][0] as string;
    expect(u).toContain("adAnalyticsV2");
    expect(u).toContain("pivot=CAMPAIGN");
    expect(decodeURIComponent(u)).toContain("sponsoredCampaign:777");
  });

  it("getAccountSummary", async () => {
    const query = mockDbCredentials();
    const svc = new LinkedInAdsService({ db: { query } });
    const s = await svc.getAccountSummary(UID);
    expect(s.impressions).toBe(9999);
    expect(s.clicks).toBe(400);
    expect(s.totalSpend).toBe(900);
    expect(s.leads).toBe(14);
    const u = globalThis.fetch.mock.calls[0][0] as string;
    expect(u).toContain("pivot=ACCOUNT");
    expect(u).toContain("accounts=List");
  });

  it("getLeadGenForms", async () => {
    const query = mockDbCredentials();
    const svc = new LinkedInAdsService({ db: { query } });
    const forms = await svc.getLeadGenForms(UID);
    expect(forms[0]?.id).toBe("556677");
    expect(forms[0]?.name).toBe("Whitepaper 2026");
    expect(forms[1]?.id).toContain("998");
    const u = globalThis.fetch.mock.calls[0][0] as string;
    expect(u).toContain("/leadGenForms?");
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new LinkedInAdsService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_linkedin_ads"), [UID]);
  });
});
