import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getConnectionMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("../../../oauth/OAuthService", () => ({
  OAuthService: {
    instance: () => ({
      getConnection: getConnectionMock,
      saveConnection: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("../../../oauth/GoogleOAuthProvider", () => ({
  GoogleOAuthProvider: vi.fn().mockImplementation(() => ({
    refreshAccessToken: refreshMock,
  })),
}));

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { GoogleDataFetcher } from "../GoogleDataFetcher";

const fetchMock = vi.fn();
const future = new Date(Date.now() + 60 * 60 * 1000);

describe("GoogleDataFetcher", () => {
  beforeEach(() => {
    GoogleDataFetcher.reset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    getConnectionMock.mockReset();
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "dev-token-test";
    getConnectionMock.mockResolvedValue({
      accessToken: "tok",
      refreshToken: "ref",
      expiresAt: future,
      scopes: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  });

  it("getSearchConsoleData llama a searchconsole.googleapis.com", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rows: [
          {
            keys: ["nelvyon seo", "https://nelvyon.com/"],
            clicks: 50,
            impressions: 1000,
            ctr: 0.05,
            position: 4.2,
          },
        ],
      }),
    });

    const data = await GoogleDataFetcher.instance().getSearchConsoleData(
      "user-1",
      "https://nelvyon.com/",
    );

    expect(data).not.toBeNull();
    expect(data!.totalClicks).toBe(50);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("searchconsole.googleapis.com");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("searchAnalytics/query");
  });

  it("getSearchConsoleData sin conexión Google devuelve null", async () => {
    getConnectionMock.mockResolvedValueOnce(null);
    const data = await GoogleDataFetcher.instance().getSearchConsoleData("user-1", "https://x.com/");
    expect(data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getAnalyticsData llama a analyticsdata.googleapis.com", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rows: [
          {
            dimensionValues: [{ value: "google" }, { value: "cpc" }],
            metricValues: [
              { value: "100" },
              { value: "5" },
              { value: "250.5" },
              { value: "0.42" },
            ],
          },
        ],
      }),
    });

    const data = await GoogleDataFetcher.instance().getAnalyticsData("user-1", "properties/123");

    expect(data).not.toBeNull();
    expect(data!.totalSessions).toBe(100);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("analyticsdata.googleapis.com");
    expect(String(fetchMock.mock.calls[0]![0])).toContain(":runReport");
  });

  it("getGoogleAdsData llama a googleAds:search con query GAQL", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            campaign: { name: "Brand", status: "ENABLED" },
            metrics: {
              clicks: "120",
              impressions: "5000",
              ctr: 0.024,
              averageCpc: "1500000",
              conversions: 8,
              costMicros: "180000000",
            },
          },
        ],
      }),
    });

    const data = await GoogleDataFetcher.instance().getGoogleAdsData("user-1", "1234567890");

    expect(data).not.toBeNull();
    expect(data!.campaigns[0]!.campaignName).toBe("Brand");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/googleAds:search");
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body)) as { query?: string };
    expect(body.query).toContain("FROM campaign");
    expect(body.query).toContain("LAST_30_DAYS");
  });
});
