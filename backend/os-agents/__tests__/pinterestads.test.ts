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
  PinterestAdsAnalyticsAgent,
  PinterestAdsAudienceAgent,
  PinterestAdsAuthAgent,
  PinterestAdsBidAgent,
  PinterestAdsCampaignAgent,
  PinterestAdsKeywordAgent,
  PinterestAdsPinAgent,
  PinterestAdsReportAgent,
  resetAllPinterestAdsAgentsForTests,
} from "../sectors/pinterestads";

const PA_JSON = JSON.stringify({
  content:
    "Pinterest Ads: OAuth2 ads API, Pins 1000×1500 CTA, CPA <15€, ROAS ≥2.5x, lookalike LTV>200€.",
  score: 91,
  highlights: ["OAuth scopes", "Pin format", "LTV seed"],
  metrics: ["ROAS"],
});

const pinterestAdsInput = {
  userId: "00000000-0000-0000-0000-00000000pa01",
  sector: "moda",
  brand: "BrandDemo",
  verticalBrief: "hogar",
  targetCpaEur: 12,
  metricsBrief: "Q4 catalog",
};

type PinterestAdsOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Pinterest Ads agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PA_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllPinterestAdsAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as PinterestAdsOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("PinterestAdsAuthAgent", async () => {
    await assertOutput("pinterestads-auth", () => PinterestAdsAuthAgent.instance.run(pinterestAdsInput));
  });

  it("PinterestAdsCampaignAgent", async () => {
    await assertOutput("pinterestads-campaign", () => PinterestAdsCampaignAgent.instance.run(pinterestAdsInput));
  });

  it("PinterestAdsPinAgent", async () => {
    await assertOutput("pinterestads-pin", () => PinterestAdsPinAgent.instance.run(pinterestAdsInput));
  });

  it("PinterestAdsAudienceAgent", async () => {
    await assertOutput("pinterestads-audience", () => PinterestAdsAudienceAgent.instance.run(pinterestAdsInput));
  });

  it("PinterestAdsBidAgent", async () => {
    await assertOutput("pinterestads-bid", () => PinterestAdsBidAgent.instance.run(pinterestAdsInput));
  });

  it("PinterestAdsReportAgent", async () => {
    await assertOutput("pinterestads-report", () => PinterestAdsReportAgent.instance.run(pinterestAdsInput));
  });

  it("PinterestAdsKeywordAgent", async () => {
    await assertOutput("pinterestads-keyword", () => PinterestAdsKeywordAgent.instance.run(pinterestAdsInput));
  });

  it("PinterestAdsAnalyticsAgent", async () => {
    await assertOutput("pinterestads-analytics", () => PinterestAdsAnalyticsAgent.instance.run(pinterestAdsInput));
  });
});
