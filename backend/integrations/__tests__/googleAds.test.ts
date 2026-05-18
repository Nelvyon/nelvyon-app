// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleAdsService, resetGoogleAdsServiceForTests } from "../GoogleAdsService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("GoogleAdsService", () => {
  beforeEach(() => {
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "test-dev-token";
    resetGoogleAdsServiceForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                campaign: { id: "1", name: "C1", status: "ENABLED" },
                metrics: { impressions: "1000", clicks: "50", costMicros: "50000000", conversions: "3" },
              },
            ],
            mutateOperationResponses: [{ campaignResult: { resourceName: "customers/123/campaigns/999" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    resetGoogleAdsServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new GoogleAdsService({ db: { query } });
    await svc.saveCredentials(UID, "123-456-7890", "at", "rt", new Date("2030-01-01T00:00:00.000Z"));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_google_ads"), [
      UID,
      "123-456-7890",
      "at",
      "rt",
      "2030-01-01T00:00:00.000Z",
    ]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        user_id: UID,
        customer_id: "123",
        access_token: "t1",
        refresh_token: "t2",
        token_expiry: new Date("2030-06-01"),
        is_active: true,
      },
    ]);
    const svc = new GoogleAdsService({ db: { query } });
    const row = await svc.getCredentials(UID);
    expect(row?.accessToken).toBe("t1");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new GoogleAdsService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("getCampaigns", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          user_id: UID,
          customer_id: "1234567890",
          access_token: "at",
          refresh_token: "rt",
          token_expiry: new Date(Date.now() + 3600_000),
          is_active: true,
        },
      ]);
    const svc = new GoogleAdsService({ db: { query } });
    const list = await svc.getCampaigns(UID);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("1");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v17/customers/1234567890/googleAds:search"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("getCampaignMetrics", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        user_id: UID,
        customer_id: "1234567890",
        access_token: "at",
        refresh_token: "rt",
        token_expiry: new Date(Date.now() + 3600_000),
        is_active: true,
      },
    ]);
    const svc = new GoogleAdsService({ db: { query } });
    const m = await svc.getCampaignMetrics(UID, "1", { start: "2026-01-01", end: "2026-01-31" });
    expect(m.campaignId).toBe("1");
    expect(m.clicks).toBe(50);
  });

  it("createCampaign", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        user_id: UID,
        customer_id: "1234567890",
        access_token: "at",
        refresh_token: "rt",
        token_expiry: new Date(Date.now() + 3600_000),
        is_active: true,
      },
    ]);
    const svc = new GoogleAdsService({ db: { query } });
    const created = await svc.createCampaign(UID, { name: "Test" });
    expect(created.campaignId).toBe("999");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/googleAds:mutate"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("getAccountSummary", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        user_id: UID,
        customer_id: "1234567890",
        access_token: "at",
        refresh_token: "rt",
        token_expiry: new Date(Date.now() + 3600_000),
        is_active: true,
      },
    ]);
    const svc = new GoogleAdsService({ db: { query } });
    const s = await svc.getAccountSummary(UID);
    expect(s.totalSpend).toBeGreaterThan(0);
    expect(s.avgCpc).toBeGreaterThan(0);
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new GoogleAdsService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE integration_google_ads"),
      [UID],
    );
  });
});
