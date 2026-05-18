import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

const completeMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: completeMock,
    }),
  },
  LLM_DEFAULT_MAX_TOKENS: 4000,
  LLM_DEFAULT_MODEL: "gpt-4o",
}));

import {
  BingAdsAdCopyAgent,
  BingAdsAnalyticsAgent,
  BingAdsAudienceAgent,
  BingAdsAuthAgent,
  BingAdsBidAgent,
  BingAdsCampaignAgent,
  BingAdsKeywordAgent,
  BingAdsReportAgent,
  resetAllBingAdsAgentsForTests,
} from "../sectors/bingads";

const BING_JSON = JSON.stringify({
  content:
    "Bing Ads: LinkedIn targeting, RSA 15+4, CPC -35% vs Google, CPA <20€, ROAS 2x+, Search+Shopping.",
  score: 91,
  highlights: ["LinkedIn profile", "RSA specs", "Quality Score"],
  metrics: ["CPC"],
});

const bingAdsInput = {
  userId: "00000000-0000-0000-0000-00000000bg01",
  sector: "legal",
  brand: "Bing Demo",
  verticalBrief: "seguros",
  targetCpaEur: 18,
  metricsBrief: "tCPA + Shopping",
};

type BingAdsOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Bing Ads agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(BING_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllBingAdsAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as BingAdsOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("BingAdsAuthAgent", async () => {
    await assertOutput("bingads-auth", () => BingAdsAuthAgent.instance.run(bingAdsInput));
  });

  it("BingAdsCampaignAgent", async () => {
    await assertOutput("bingads-campaign", () => BingAdsCampaignAgent.instance.run(bingAdsInput));
  });

  it("BingAdsKeywordAgent", async () => {
    await assertOutput("bingads-keyword", () => BingAdsKeywordAgent.instance.run(bingAdsInput));
  });

  it("BingAdsAudienceAgent", async () => {
    await assertOutput("bingads-audience", () => BingAdsAudienceAgent.instance.run(bingAdsInput));
  });

  it("BingAdsBidAgent", async () => {
    await assertOutput("bingads-bid", () => BingAdsBidAgent.instance.run(bingAdsInput));
  });

  it("BingAdsAdCopyAgent", async () => {
    await assertOutput("bingads-adcopy", () => BingAdsAdCopyAgent.instance.run(bingAdsInput));
  });

  it("BingAdsReportAgent", async () => {
    await assertOutput("bingads-report", () => BingAdsReportAgent.instance.run(bingAdsInput));
  });

  it("BingAdsAnalyticsAgent", async () => {
    await assertOutput("bingads-analytics", () => BingAdsAnalyticsAgent.instance.run(bingAdsInput));
  });
});
