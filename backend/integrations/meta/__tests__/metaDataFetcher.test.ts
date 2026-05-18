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

import { MetaDataFetcher } from "../MetaDataFetcher";

const fetchMock = vi.fn();
const future = new Date(Date.now() + 60 * 60 * 1000);

describe("MetaDataFetcher", () => {
  beforeEach(() => {
    MetaDataFetcher.reset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    getConnectionMock.mockReset();
    getConnectionMock.mockResolvedValue({
      accessToken: "meta-tok",
      expiresAt: future,
      scopes: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAdAccountInsights llama a graph.facebook.com insights", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            campaign_name: "Prospecting",
            impressions: "10000",
            clicks: "400",
            spend: "250.50",
            ctr: "4.0",
            cpc: "0.62",
            actions: [{ action_type: "purchase", value: "12" }],
            purchase_roas: [{ value: "2.5" }],
          },
        ],
      }),
    });

    const data = await MetaDataFetcher.instance().getAdAccountInsights("user-1", "act_123");

    expect(data).not.toBeNull();
    expect(data!.campaigns[0]!.campaignName).toBe("Prospecting");
    expect(data!.totalSpend).toBe(250.5);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("graph.facebook.com");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("act_123/insights");
  });

  it("sin conexión Meta devuelve null", async () => {
    getConnectionMock.mockResolvedValueOnce(null);
    const data = await MetaDataFetcher.instance().getAdAccountInsights("user-1", "act_999");
    expect(data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
