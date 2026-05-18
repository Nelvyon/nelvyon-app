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
  YouTubeAdsAnalyticsAgent,
  YouTubeAdsAudienceAgent,
  YouTubeAdsAuthAgent,
  YouTubeAdsBidAgent,
  YouTubeAdsCampaignAgent,
  YouTubeAdsReportAgent,
  YouTubeAdsScriptAgent,
  YouTubeAdsThumbnailAgent,
  resetAllYouTubeAdsAgentsForTests,
} from "../sectors/youtubeads";

const YT_JSON = JSON.stringify({
  content:
    "YouTube Ads: TrueView/Bumper/In-Feed, gancho 5s, CPV <0.03€, VTR >30%, ROAS 2x+, scripts 15/30/60s.",
  score: 91,
  highlights: ["Google Ads OAuth", "Hook <5s", "Similar audiences"],
  metrics: ["CPV"],
});

const youTubeAdsInput = {
  userId: "00000000-0000-0000-0000-00000000yt01",
  sector: "saas_b2b",
  brand: "YT Demo",
  verticalBrief: "educación",
  targetCpvEur: 0.025,
  metricsBrief: "VTR lift Q1",
};

type YouTubeAdsOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("YouTube Ads agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(YT_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllYouTubeAdsAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as YouTubeAdsOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("YouTubeAdsAuthAgent", async () => {
    await assertOutput("youtubeads-auth", () => YouTubeAdsAuthAgent.instance.run(youTubeAdsInput));
  });

  it("YouTubeAdsCampaignAgent", async () => {
    await assertOutput("youtubeads-campaign", () => YouTubeAdsCampaignAgent.instance.run(youTubeAdsInput));
  });

  it("YouTubeAdsScriptAgent", async () => {
    await assertOutput("youtubeads-script", () => YouTubeAdsScriptAgent.instance.run(youTubeAdsInput));
  });

  it("YouTubeAdsAudienceAgent", async () => {
    await assertOutput("youtubeads-audience", () => YouTubeAdsAudienceAgent.instance.run(youTubeAdsInput));
  });

  it("YouTubeAdsBidAgent", async () => {
    await assertOutput("youtubeads-bid", () => YouTubeAdsBidAgent.instance.run(youTubeAdsInput));
  });

  it("YouTubeAdsThumbnailAgent", async () => {
    await assertOutput("youtubeads-thumbnail", () => YouTubeAdsThumbnailAgent.instance.run(youTubeAdsInput));
  });

  it("YouTubeAdsReportAgent", async () => {
    await assertOutput("youtubeads-report", () => YouTubeAdsReportAgent.instance.run(youTubeAdsInput));
  });

  it("YouTubeAdsAnalyticsAgent", async () => {
    await assertOutput("youtubeads-analytics", () => YouTubeAdsAnalyticsAgent.instance.run(youTubeAdsInput));
  });
});
