// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MetaAdsService, resetMetaAdsServiceForTests } from "../MetaAdsService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function credRow() {
  return [
    {
      user_id: UID,
      ad_account_id: "123456789",
      access_token: "META_ACCESS",
      pixel_id: "PIXEL999",
      is_active: true,
    },
  ];
}

describe("MetaAdsService", () => {
  beforeEach(() => {
    resetMetaAdsServiceForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: string | Request) => {
        const url = typeof input === "string" ? input : input.url;
        let json: Record<string, unknown>;
        if (url.includes("/events")) {
          json = { events_received: 1 };
        } else if (url.includes("/campaigns")) {
          json = {
            data: [
              {
                id: "1",
                name: "Camp",
                status: "ACTIVE",
                objective: "OUTCOME_LEADS",
                insights: {
                  data: [
                    {
                      impressions: "1000",
                      clicks: "50",
                      spend: "25",
                      conversions: "2",
                    },
                  ],
                },
              },
            ],
          };
        } else {
          json = { data: [{ impressions: "2000", clicks: "100", spend: "80" }] };
        }
        return new Response(JSON.stringify(json), { status: 200, headers: { "Content-Type": "application/json" } });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetMetaAdsServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new MetaAdsService({ db: { query } });
    await svc.saveCredentials(UID, "act_998877", "tok", "pix");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_meta_ads"), [
      UID,
      "998877",
      "tok",
      "pix",
    ]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new MetaAdsService({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.pixelId).toBe("PIXEL999");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new MetaAdsService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("getCampaigns", async () => {
    const query = vi.fn().mockResolvedValueOnce(credRow());
    const svc = new MetaAdsService({ db: { query } });
    const camps = await svc.getCampaigns(UID);
    expect(camps).toHaveLength(1);
    expect(camps[0]?.conversions).toBe(2);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/act_123456789/campaigns"), expect.any(Object));
    expect(globalThis.fetch.mock.calls[0][0]).toContain("access_token=");
  });

  it("getCampaignMetrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                impressions: "400",
                clicks: "20",
                spend: "12",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const query = vi.fn().mockResolvedValueOnce(credRow());
    const svc = new MetaAdsService({ db: { query } });
    const m = await svc.getCampaignMetrics(UID, "42", { since: "2026-01-01", until: "2026-01-31" });
    expect(m.campaignId).toBe("42");
    expect(m.clicks).toBe(20);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/42/insights"), expect.any(Object));
    expect(globalThis.fetch.mock.calls[0][0]).toContain("access_token=");
  });

  it("sendConversionEvent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ events_received: 1 }), { status: 200, headers: { "Content-Type": "application/json" } }),
      ),
    );
    const query = vi.fn().mockResolvedValueOnce(credRow());
    const svc = new MetaAdsService({ db: { query } });
    const r = await svc.sendConversionEvent(UID, {
      eventName: "Purchase",
      eventTime: 1_700_000_000,
      userData: { em: "x" },
      customData: { value: 99 },
    });
    expect(r.eventId).toBeTruthy();
    const callUrl = globalThis.fetch.mock.calls[0][0] as string;
    expect(callUrl).toContain("/PIXEL999/events");
    expect(callUrl).toContain("access_token=");
  });

  it("getAccountSummary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ data: [{ impressions: "1000", clicks: "100", spend: "250" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const query = vi.fn().mockResolvedValueOnce(credRow());
    const svc = new MetaAdsService({ db: { query } });
    const s = await svc.getAccountSummary(UID);
    expect(s.totalSpend).toBe(250);
    expect(s.ctr).toBe(0.1);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("date_preset=last_30d"), expect.any(Object));
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new MetaAdsService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_meta_ads"), [UID]);
  });
});
