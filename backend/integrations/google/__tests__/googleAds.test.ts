import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getConnectionMock = vi.fn();
const saveConnectionMock = vi.fn();

vi.mock("../../../oauth/OAuthService", () => ({
  OAuthService: {
    instance: () => ({
      getConnection: getConnectionMock,
      saveConnection: saveConnectionMock,
    }),
  },
}));

vi.mock("../../../oauth/GoogleOAuthProvider", () => ({
  GoogleOAuthProvider: vi.fn(),
}));

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { GoogleAdsExecutor } from "../GoogleAdsExecutor";

const fetchMock = vi.fn();
const future = new Date(Date.now() + 60 * 60 * 1000);

describe("GoogleAdsExecutor", () => {
  beforeEach(() => {
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "dev-token-test";
    GoogleAdsExecutor.reset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    getConnectionMock.mockReset();
    saveConnectionMock.mockReset();
    getConnectionMock.mockResolvedValue({
      accessToken: "tok",
      refreshToken: "ref",
      expiresAt: future,
      scopes: [],
      userId: "user-1",
      provider: "google",
      isActive: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  });

  it("listCustomerAccounts llama a listAccessibleCustomers", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resourceNames: ["customers/111", "customers/222"] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          descriptiveName: "Account One",
          currencyCode: "EUR",
          timeZone: "Europe/Madrid",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          descriptiveName: "Account Two",
          currencyCode: "USD",
          timeZone: "America/New_York",
        }),
      });

    const accounts = await GoogleAdsExecutor.instance().listCustomerAccounts("user-1");

    expect(accounts).toHaveLength(2);
    expect(accounts[0]!.customerId).toBe("111");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("listAccessibleCustomers");
  });

  it("createBudget llama a campaignBudgets:mutate", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ resourceName: "customers/123/campaignBudgets/456" }] }),
    });

    const result = await GoogleAdsExecutor.instance().createBudget("user-1", "123", 5_000_000);

    expect(result.budgetResourceName).toBe("customers/123/campaignBudgets/456");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/campaignBudgets:mutate");
  });

  it("createCampaign llama a campaigns:mutate y devuelve campaignId", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ resourceName: "customers/123/campaigns/789" }] }),
    });

    const result = await GoogleAdsExecutor.instance().createCampaign("user-1", "123", {
      name: "Test Campaign",
      budgetResourceName: "customers/123/campaignBudgets/456",
    });

    expect(result.campaignId).toBe("789");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/campaigns:mutate");
  });

  it("createAdGroup llama a adGroups:mutate y devuelve adGroupId", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ resourceName: "customers/123/adGroups/321" }] }),
    });

    const result = await GoogleAdsExecutor.instance().createAdGroup("user-1", "123", {
      name: "Ad Group",
      campaignResourceName: "customers/123/campaigns/789",
    });

    expect(result.adGroupId).toBe("321");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/adGroups:mutate");
  });

  it("addKeywords llama a adGroupCriteria:mutate", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

    await GoogleAdsExecutor.instance().addKeywords(
      "user-1",
      "123",
      "customers/123/adGroups/321",
      ["nelvyon", "marketing"],
    );

    expect(String(fetchMock.mock.calls[0]![0])).toContain("/adGroupCriteria:mutate");
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body)) as {
      operations: unknown[];
    };
    expect(body.operations).toHaveLength(2);
  });

  it("createResponsiveSearchAd llama a adGroupAds:mutate", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ resourceName: "customers/123/adGroupAds/555" }] }),
    });

    const result = await GoogleAdsExecutor.instance().createResponsiveSearchAd("user-1", "123", {
      adGroupResourceName: "customers/123/adGroups/321",
      headlines: ["H1", "H2", "H3"],
      descriptions: ["D1", "D2"],
      finalUrl: "https://nelvyon.com",
    });

    expect(result.adId).toBe("555");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/adGroupAds:mutate");
  });
});
