import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const getConnectionMock = vi.fn();
const saveConnectionMock = vi.fn().mockResolvedValue(undefined);
const fetchMock = vi.fn();

vi.mock("../../../oauth/OAuthService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../oauth/OAuthService")>();
  return {
    ...actual,
    OAuthService: {
      instance: () => ({
        getConnection: getConnectionMock,
        saveConnection: saveConnectionMock,
      }),
    },
  };
});

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { decrypt, encrypt } from "../../../oauth/OAuthService";
import { GoogleAdsExecutor } from "../../../integrations/google/GoogleAdsExecutor";
import { MetaAdsExecutor } from "../../../integrations/meta/MetaAdsExecutor";

const future = new Date("2027-01-01T00:00:00.000Z");

describe("flow: integraciones — Google Ads + Meta Ads (OAuth mockeado)", () => {
  beforeAll(() => {
    process.env.OAUTH_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "dev-token-test";
  });

  beforeEach(() => {
    GoogleAdsExecutor.reset();
    MetaAdsExecutor.reset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    getConnectionMock.mockReset();
    saveConnectionMock.mockClear();
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
  });

  it("Google Ads launch: budget → campaign → adGroup → keywords → RSA (5 fetch)", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ resourceName: "customers/123/campaignBudgets/456" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ resourceName: "customers/123/campaigns/789" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ resourceName: "customers/123/adGroups/321" }] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ resourceName: "customers/123/adGroupAds/555" }] }),
      });

    const exec = GoogleAdsExecutor.instance();
    await exec.createBudget("user-1", "123", 5_000_000);
    await exec.createCampaign("user-1", "123", {
      name: "Camp",
      budgetResourceName: "customers/123/campaignBudgets/456",
    });
    await exec.createAdGroup("user-1", "123", {
      name: "AG",
      campaignResourceName: "customers/123/campaigns/789",
    });
    await exec.addKeywords("user-1", "123", "customers/123/adGroups/321", ["kw1"]);
    await exec.createResponsiveSearchAd("user-1", "123", {
      adGroupResourceName: "customers/123/adGroups/321",
      headlines: ["H1", "H2", "H3"],
      descriptions: ["D1", "D2"],
      finalUrl: "https://nelvyon.com",
    });

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("Google Ads sin conexión → Error not connected", async () => {
    getConnectionMock.mockResolvedValueOnce(null);
    await expect(GoogleAdsExecutor.instance().createBudget("user-1", "123", 1000)).rejects.toThrow(
      /not connected/i,
    );
  });

  it("Meta Ads: campaign → adSet → creative → ad (4 fetch)", async () => {
    getConnectionMock.mockResolvedValue({
      accessToken: "meta-tok",
      expiresAt: future,
      scopes: [],
      userId: "user-1",
      provider: "meta",
      isActive: true,
    });

    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "camp-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "adset-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "creative-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "ad-1" }) });

    const exec = MetaAdsExecutor.instance();
    await exec.createCampaign("user-1", "act_123", { name: "Meta Camp" });
    await exec.createAdSet("user-1", "act_123", {
      name: "AdSet",
      campaignId: "camp-1",
      dailyBudgetCents: 5000,
    });
    await exec.createAdCreative("user-1", "act_123", {
      name: "Creative",
      pageId: "page-1",
      primaryText: "Text",
      headline: "Head",
      websiteUrl: "https://nelvyon.com",
    });
    await exec.createAd("user-1", "act_123", {
      name: "Ad",
      adSetId: "adset-1",
      creativeId: "creative-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("Meta Ads sin conexión → Error not connected", async () => {
    getConnectionMock.mockResolvedValueOnce(null);
    await expect(MetaAdsExecutor.instance().listAdAccounts("user-1")).rejects.toThrow(/not connected/i);
  });

  it("encrypt/decrypt round-trip OAuth íntegro", () => {
    expect(decrypt(encrypt("oauth-secret-value"))).toBe("oauth-secret-value");
  });
});
