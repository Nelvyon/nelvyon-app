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
  SocialListeningBrandCompetitorAgent,
  SocialListeningBrandCrisisAgent,
  SocialListeningBrandInfluencerAgent,
  SocialListeningBrandInsightsAgent,
  SocialListeningBrandMonitorAgent,
  SocialListeningBrandReportAgent,
  SocialListeningBrandSentimentAgent,
  SocialListeningBrandTrendAgent,
  resetAllSocialListeningBrandAgentsForTests,
} from "../sectors/sociallisteningbrand";

const SLB_JSON = JSON.stringify({
  content:
    "SocialListeningBrand: menciones <2 min, 50+ fuentes, crisis <2 min, SOV hourly, sentiment >92%, trends <1h.",
  score: 94,
  highlights: ["<2 min", "50+ fuentes", ">92% sentiment"],
  metrics: ["Share of voice"],
});

const socialListeningBrandInput = {
  userId: "00000000-0000-0000-0000-00000000sl01",
  sector: "saas",
  brand: "SaaS demo",
  brandBrief: "Escucha social · SOV · crisis",
  metricsBrief: "Sentiment · SOV",
};

type SocialListeningBrandOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SocialListeningBrand agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SLB_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSocialListeningBrandAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SocialListeningBrandOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SocialListeningBrandMonitorAgent", async () => {
    await assertOutput("sociallisteningbrand-monitor", () =>
      SocialListeningBrandMonitorAgent.instance.run(socialListeningBrandInput),
    );
  });

  it("SocialListeningBrandSentimentAgent", async () => {
    await assertOutput("sociallisteningbrand-sentiment", () =>
      SocialListeningBrandSentimentAgent.instance.run(socialListeningBrandInput),
    );
  });

  it("SocialListeningBrandCompetitorAgent", async () => {
    await assertOutput("sociallisteningbrand-competitor", () =>
      SocialListeningBrandCompetitorAgent.instance.run(socialListeningBrandInput),
    );
  });

  it("SocialListeningBrandTrendAgent", async () => {
    await assertOutput("sociallisteningbrand-trend", () =>
      SocialListeningBrandTrendAgent.instance.run(socialListeningBrandInput),
    );
  });

  it("SocialListeningBrandInfluencerAgent", async () => {
    await assertOutput("sociallisteningbrand-influencer", () =>
      SocialListeningBrandInfluencerAgent.instance.run(socialListeningBrandInput),
    );
  });

  it("SocialListeningBrandCrisisAgent", async () => {
    await assertOutput("sociallisteningbrand-crisis", () =>
      SocialListeningBrandCrisisAgent.instance.run(socialListeningBrandInput),
    );
  });

  it("SocialListeningBrandInsightsAgent", async () => {
    await assertOutput("sociallisteningbrand-insights", () =>
      SocialListeningBrandInsightsAgent.instance.run(socialListeningBrandInput),
    );
  });

  it("SocialListeningBrandReportAgent", async () => {
    await assertOutput("sociallisteningbrand-report", () =>
      SocialListeningBrandReportAgent.instance.run(socialListeningBrandInput),
    );
  });
});
