import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getConnectionMock = vi.fn();

vi.mock("../../../oauth/OAuthService", () => ({
  OAuthService: {
    instance: () => ({
      getConnection: getConnectionMock,
    }),
  },
}));

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { MetaAdsExecutor } from "../MetaAdsExecutor";

const fetchMock = vi.fn();
const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

describe("MetaAdsExecutor", () => {
  beforeEach(() => {
    MetaAdsExecutor.reset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    getConnectionMock.mockReset();
    getConnectionMock.mockResolvedValue({
      accessToken: "tok",
      expiresAt: future,
      scopes: [],
      userId: "user-1",
      provider: "meta",
      isActive: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listAdAccounts llama a /me/adaccounts", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: "act_111", name: "Main", currency: "EUR", account_status: 1 },
          { id: "act_222", name: "Secondary", currency: "USD", account_status: 1 },
        ],
      }),
    });

    const accounts = await MetaAdsExecutor.instance().listAdAccounts("user-1");

    expect(accounts).toHaveLength(2);
    expect(accounts[0]!.adAccountId).toBe("act_111");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/me/adaccounts");
  });

  it("createCampaign llama a /{adAccountId}/campaigns", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "camp-999" }),
    });

    const result = await MetaAdsExecutor.instance().createCampaign("user-1", "act_123", {
      name: "Meta Campaign",
    });

    expect(result.campaignId).toBe("camp-999");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/act_123/campaigns");
    const init = fetchMock.mock.calls[0]![1] as { method?: string; body?: URLSearchParams };
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("status=PAUSED");
  });

  it("createAdSet llama a /{adAccountId}/adsets con targeting JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "adset-1" }),
    });

    const result = await MetaAdsExecutor.instance().createAdSet("user-1", "act_123", {
      name: "Ad Set",
      campaignId: "camp-999",
      dailyBudgetCents: 5000,
      countries: ["ES", "PT"],
    });

    expect(result.adSetId).toBe("adset-1");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/act_123/adsets");
    const body = String(fetchMock.mock.calls[0]![1]?.body);
    expect(body).toContain("targeting=");
    expect(body).toContain("ES");
  });

  it("createAdCreative llama a /{adAccountId}/adcreatives", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "creative-1" }),
    });

    const result = await MetaAdsExecutor.instance().createAdCreative("user-1", "act_123", {
      name: "Creative",
      pageId: "page-1",
      primaryText: "Hello",
      headline: "Headline",
      websiteUrl: "https://nelvyon.com",
    });

    expect(result.creativeId).toBe("creative-1");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/act_123/adcreatives");
    expect(String(fetchMock.mock.calls[0]![1]?.body)).toContain("object_story_spec=");
  });

  it("createAd llama a /{adAccountId}/ads", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "ad-1" }),
    });

    const result = await MetaAdsExecutor.instance().createAd("user-1", "act_123", {
      name: "Ad",
      adSetId: "adset-1",
      creativeId: "creative-1",
    });

    expect(result.adId).toBe("ad-1");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/act_123/ads");
  });
});
