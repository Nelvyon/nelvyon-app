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
  SocialAnalyticsNarratorAgent,
  SocialCampaignLaunchAgent,
  SocialCompetitorMonitorAgent,
  SocialContentCalendarAgent,
  SocialCopywriterAgent,
  SocialCrisisResponseAgent,
  SocialEngagementHooksAgent,
  SocialHashtagStrategistAgent,
  SocialStorytellingAgent,
  resetAllSocialAgentsForTests,
} from "../sectors/social";

const SAMPLE_JSON = JSON.stringify({
  content: "ENGAGE: Emotion, Narrative, Goal, Action, Growth, Evaluate aplicado.",
  score: 83,
  posts: ["Post A: hook + CTA bio", "Post B: prueba social + pregunta", "Post C: tutorial mini-paso"],
  hashtags: ["marca", "comunidad", "tips"],
});

const baseInput = {
  userId: "00000000-0000-0000-0000-0000000022bb",
  sector: "retail",
  brand: "UrbanFit",
  platforms: ["instagram", "tiktok"],
  targetAudience: "activos urbanos 22–35",
  campaignGoal: "Engagement semanal",
  tone: "motivacional",
};

describe("Social media management agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SAMPLE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSocialAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertValid(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      posts: string[];
      hashtags: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.posts.length).toBeGreaterThanOrEqual(1);
    expect(out.hashtags.length).toBeGreaterThanOrEqual(1);
  }

  it("SocialContentCalendarAgent", async () => {
    await assertValid("social-content-calendar", () => SocialContentCalendarAgent.instance.run(baseInput));
  });

  it("SocialCopywriterAgent", async () => {
    await assertValid("social-copywriter", () => SocialCopywriterAgent.instance.run(baseInput));
  });

  it("SocialHashtagStrategistAgent", async () => {
    await assertValid("social-hashtag-strategist", () => SocialHashtagStrategistAgent.instance.run(baseInput));
  });

  it("SocialEngagementHooksAgent", async () => {
    await assertValid("social-engagement-hooks", () => SocialEngagementHooksAgent.instance.run(baseInput));
  });

  it("SocialStorytellingAgent", async () => {
    await assertValid("social-storytelling", () => SocialStorytellingAgent.instance.run(baseInput));
  });

  it("SocialCrisisResponseAgent", async () => {
    await assertValid("social-crisis-response", () => SocialCrisisResponseAgent.instance.run(baseInput));
  });

  it("SocialCompetitorMonitorAgent", async () => {
    await assertValid("social-competitor-monitor", () => SocialCompetitorMonitorAgent.instance.run(baseInput));
  });

  it("SocialCampaignLaunchAgent", async () => {
    await assertValid("social-campaign-launch", () => SocialCampaignLaunchAgent.instance.run(baseInput));
  });

  it("SocialAnalyticsNarratorAgent", async () => {
    await assertValid("social-analytics-narrator", () => SocialAnalyticsNarratorAgent.instance.run(baseInput));
  });
});
