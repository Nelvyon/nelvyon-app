import { beforeEach, describe, expect, it, vi } from "vitest";

const listConnectionsMock = vi.fn();
const getSearchConsoleMock = vi.fn();
const getAnalyticsMock = vi.fn();
const getGoogleAdsMock = vi.fn();
const getMetaInsightsMock = vi.fn();

vi.mock("../../oauth/OAuthService", () => ({
  OAuthService: {
    instance: () => ({
      listConnections: listConnectionsMock,
    }),
  },
}));

vi.mock("../../integrations/google/GoogleDataFetcher", () => ({
  GoogleDataFetcher: {
    instance: () => ({
      getSearchConsoleData: getSearchConsoleMock,
      getAnalyticsData: getAnalyticsMock,
      getGoogleAdsData: getGoogleAdsMock,
    }),
  },
}));

vi.mock("../../integrations/meta/MetaDataFetcher", () => ({
  MetaDataFetcher: {
    instance: () => ({
      getAdAccountInsights: getMetaInsightsMock,
    }),
  },
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { enrichAgentContext, formatContextForPrompt } from "../contextEnricher";

describe("contextEnricher", () => {
  beforeEach(() => {
    listConnectionsMock.mockReset();
    getSearchConsoleMock.mockReset();
    getAnalyticsMock.mockReset();
    getGoogleAdsMock.mockReset();
    getMetaInsightsMock.mockReset();
    listConnectionsMock.mockResolvedValue([]);
  });

  it("enrichAgentContext sin conexiones → todos null", async () => {
    const ctx = await enrichAgentContext("user-1", { siteUrl: "https://x.com" });
    expect(ctx.searchConsoleData).toBeNull();
    expect(ctx.analyticsData).toBeNull();
    expect(ctx.googleAdsData).toBeNull();
    expect(ctx.metaAdsData).toBeNull();
    expect(getSearchConsoleMock).not.toHaveBeenCalled();
  });

  it("enrichAgentContext con Google + siteUrl → searchConsole populated", async () => {
    listConnectionsMock.mockResolvedValueOnce([{ provider: "google", isActive: true }]);
    getSearchConsoleMock.mockResolvedValueOnce({
      topQueries: [{ query: "q1", page: "/p", clicks: 10, impressions: 100, ctr: 0.1, position: 3 }],
      topPages: [],
      totalClicks: 10,
      totalImpressions: 100,
      avgCtr: 10,
      avgPosition: 3,
    });

    const ctx = await enrichAgentContext("user-1", { siteUrl: "https://nelvyon.com/" });

    expect(ctx.searchConsoleData?.totalClicks).toBe(10);
    expect(getSearchConsoleMock).toHaveBeenCalledWith("user-1", "https://nelvyon.com/");
  });

  it("formatContextForPrompt con datos contiene DATOS REALES", () => {
    const text = formatContextForPrompt({
      searchConsoleData: {
        topQueries: [{ query: "seo", page: "/", clicks: 5, impressions: 50, ctr: 0.1, position: 2 }],
        topPages: [],
        totalClicks: 5,
        totalImpressions: 50,
        avgCtr: 10,
        avgPosition: 2,
      },
      analyticsData: null,
      googleAdsData: null,
      metaAdsData: null,
    });
    expect(text).toContain("DATOS REALES DE SEARCH CONSOLE");
    expect(text).toContain("Clics totales: 5");
  });

  it("formatContextForPrompt sin datos → no tiene cuentas conectadas", () => {
    const text = formatContextForPrompt({
      searchConsoleData: null,
      analyticsData: null,
      googleAdsData: null,
      metaAdsData: null,
    });
    expect(text).toContain("no tiene cuentas conectadas");
  });

  it("fallo en una fuente no lanza error y el resto sigue OK", async () => {
    listConnectionsMock.mockResolvedValueOnce([
      { provider: "google", isActive: true },
      { provider: "meta", isActive: true },
    ]);
    getSearchConsoleMock.mockRejectedValueOnce(new Error("SC down"));
    getMetaInsightsMock.mockResolvedValueOnce({
      campaigns: [],
      totalSpend: 100,
      totalConversions: 5,
      avgRoas: 2,
    });

    const ctx = await enrichAgentContext("user-1", {
      siteUrl: "https://nelvyon.com/",
      metaAdAccountId: "act_1",
    });

    expect(ctx.searchConsoleData).toBeNull();
    expect(ctx.metaAdsData?.totalSpend).toBe(100);
  });
});
