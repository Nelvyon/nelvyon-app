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
  CommunityAnalyticsAgent,
  CommunityContentAgent,
  CommunityEngagementAgent,
  CommunityGrowthAgent,
  CommunityModerationAgent,
  CommunityMonetizationAgent,
  CommunityOnboardingAgent,
  CommunityRetentionAgent,
  resetAllCommunityAgentsForTests,
} from "../sectors/community";

const CM_JSON = JSON.stringify({
  content:
    "Community: DAU/MAU >40%, primer engagement <5 min, retención M1 >80%, moderación 100% auto, >15€/activo, >25% orgánico.",
  score: 94,
  highlights: [">40% DAU/MAU", "<5 min", ">80% M1"],
  metrics: ["DAU/MAU"],
});

const communityInput = {
  userId: "00000000-0000-0000-0000-00000000cm01",
  sector: "saas",
  brand: "SaaS demo",
  communityBrief: "Community building · engagement",
  metricsBrief: "DAU/MAU · retención",
};

type CommunityOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Community agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CM_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllCommunityAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as CommunityOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("CommunityOnboardingAgent", async () => {
    await assertOutput("community-onboarding", () => CommunityOnboardingAgent.instance.run(communityInput));
  });

  it("CommunityEngagementAgent", async () => {
    await assertOutput("community-engagement", () => CommunityEngagementAgent.instance.run(communityInput));
  });

  it("CommunityModerationAgent", async () => {
    await assertOutput("community-moderation", () => CommunityModerationAgent.instance.run(communityInput));
  });

  it("CommunityContentAgent", async () => {
    await assertOutput("community-content", () => CommunityContentAgent.instance.run(communityInput));
  });

  it("CommunityRetentionAgent", async () => {
    await assertOutput("community-retention", () => CommunityRetentionAgent.instance.run(communityInput));
  });

  it("CommunityAnalyticsAgent", async () => {
    await assertOutput("community-analytics", () => CommunityAnalyticsAgent.instance.run(communityInput));
  });

  it("CommunityGrowthAgent", async () => {
    await assertOutput("community-growth", () => CommunityGrowthAgent.instance.run(communityInput));
  });

  it("CommunityMonetizationAgent", async () => {
    await assertOutput("community-monetization", () => CommunityMonetizationAgent.instance.run(communityInput));
  });
});
