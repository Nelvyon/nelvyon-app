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
  SocialShareAnalyticsAgent,
  SocialShareCopyAgent,
  SocialShareCTAAgent,
  SocialShareImageAgent,
  SocialShareSchedulerAgent,
  SocialShareTemplateAgent,
  SocialShareTrackerAgent,
  SocialShareViralAgent,
  resetAllSocialShareAgentsForTests,
} from "../sectors/social_share";

const SHARE_JSON = JSON.stringify({
  content: "Share con referral único; viral boost si >500 clicks/24h.",
  score: 89,
  highlights: ["OG + métricas verificadas", "UTM referral_share"],
  metrics: ["CTR LinkedIn", "k-factor 7d"],
});

const socialShareInput = {
  userId: "00000000-0000-0000-0000-000000005551",
  sector: "marketing",
  brand: "Acme",
  referralLink: "https://app.example/r/XYZ",
  primaryNetwork: "linkedin",
  metricsSummary: "ARR +18%",
};

type SocialShareOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Social share agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SHARE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSocialShareAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SocialShareOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SocialShareImageAgent", async () => {
    await assertOutput("social-share-image", () => SocialShareImageAgent.instance.run(socialShareInput));
  });

  it("SocialShareCopyAgent", async () => {
    await assertOutput("social-share-copy", () => SocialShareCopyAgent.instance.run(socialShareInput));
  });

  it("SocialShareSchedulerAgent", async () => {
    await assertOutput("social-share-scheduler", () => SocialShareSchedulerAgent.instance.run(socialShareInput));
  });

  it("SocialShareTrackerAgent", async () => {
    await assertOutput("social-share-tracker", () => SocialShareTrackerAgent.instance.run(socialShareInput));
  });

  it("SocialShareViralAgent", async () => {
    await assertOutput("social-share-viral", () => SocialShareViralAgent.instance.run(socialShareInput));
  });

  it("SocialShareTemplateAgent", async () => {
    await assertOutput("social-share-template", () => SocialShareTemplateAgent.instance.run(socialShareInput));
  });

  it("SocialShareAnalyticsAgent", async () => {
    await assertOutput("social-share-analytics", () => SocialShareAnalyticsAgent.instance.run(socialShareInput));
  });

  it("SocialShareCTAAgent", async () => {
    await assertOutput("social-share-cta", () => SocialShareCTAAgent.instance.run(socialShareInput));
  });
});
