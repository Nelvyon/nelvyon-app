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
  SuperiorSocialMediaAdsAgent,
  SuperiorSocialMediaAnalyticsAgent,
  SuperiorSocialMediaCopyAgent,
  SuperiorSocialMediaInfluencerAgent,
  SuperiorSocialMediaListeningAgent,
  SuperiorSocialMediaSchedulerAgent,
  SuperiorSocialMediaStrategyAgent,
  SuperiorSocialMediaViralAgent,
  resetAllSuperiorSocialMediaAgentsForTests,
} from "../sectors/superiorsocialmedia";

const SSM_JSON = JSON.stringify({
  content:
    "SuperiorSocialMedia: ER>5%, 90d calendar <10s, multi-platform, <2m mentions, viral 3s hooks.",
  score: 91,
  highlights: [">5% ER", "90d calendar", "<2m mentions"],
  metrics: ["Engagement rate"],
});

const superiorSocialMediaInput = {
  userId: "00000000-0000-0000-0000-00000000ss01",
  sector: "retail",
  brand: "Marca social",
  socialBrief: "Lanzamiento Q3 multi-red",
  metricsBrief: "ER reach SOV",
};

type SuperiorSocialMediaOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorSocialMedia agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SSM_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorSocialMediaAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorSocialMediaOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorSocialMediaStrategyAgent", async () => {
    await assertOutput("superiorsocialmedia-strategy", () =>
      SuperiorSocialMediaStrategyAgent.instance.run(superiorSocialMediaInput),
    );
  });

  it("SuperiorSocialMediaCopyAgent", async () => {
    await assertOutput("superiorsocialmedia-copy", () => SuperiorSocialMediaCopyAgent.instance.run(superiorSocialMediaInput));
  });

  it("SuperiorSocialMediaAnalyticsAgent", async () => {
    await assertOutput("superiorsocialmedia-analytics", () =>
      SuperiorSocialMediaAnalyticsAgent.instance.run(superiorSocialMediaInput),
    );
  });

  it("SuperiorSocialMediaSchedulerAgent", async () => {
    await assertOutput("superiorsocialmedia-scheduler", () =>
      SuperiorSocialMediaSchedulerAgent.instance.run(superiorSocialMediaInput),
    );
  });

  it("SuperiorSocialMediaAdsAgent", async () => {
    await assertOutput("superiorsocialmedia-ads", () => SuperiorSocialMediaAdsAgent.instance.run(superiorSocialMediaInput));
  });

  it("SuperiorSocialMediaListeningAgent", async () => {
    await assertOutput("superiorsocialmedia-listening", () =>
      SuperiorSocialMediaListeningAgent.instance.run(superiorSocialMediaInput),
    );
  });

  it("SuperiorSocialMediaInfluencerAgent", async () => {
    await assertOutput("superiorsocialmedia-influencer", () =>
      SuperiorSocialMediaInfluencerAgent.instance.run(superiorSocialMediaInput),
    );
  });

  it("SuperiorSocialMediaViralAgent", async () => {
    await assertOutput("superiorsocialmedia-viral", () => SuperiorSocialMediaViralAgent.instance.run(superiorSocialMediaInput));
  });
});
