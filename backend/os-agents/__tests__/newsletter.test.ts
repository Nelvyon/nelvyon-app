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
  NewsletterABTestAgent,
  NewsletterAnalyticsAgent,
  NewsletterChurnAgent,
  NewsletterGrowthAgent,
  NewsletterMonetizationAgent,
  NewsletterPersonalizationAgent,
  NewsletterSchedulerAgent,
  NewsletterWriterAgent,
  resetAllNewsletterAgentsForTests,
} from "../sectors/newsletter";

const NL_JSON = JSON.stringify({
  content:
    "Newsletter: open >45%, CTR >8%, revenue/email >0.50€, 100% personalización, monetización auto, +20% mensual.",
  score: 94,
  highlights: [">45% open", ">8% CTR", ">0.50€/email"],
  metrics: ["Open rate"],
});

const newsletterInput = {
  userId: "00000000-0000-0000-0000-00000000nl01",
  sector: "saas",
  brand: "SaaS demo",
  newsletterBrief: "Newsletter · monetización",
  metricsBrief: "Open · CTR",
};

type NewsletterOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Newsletter agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(NL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllNewsletterAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as NewsletterOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("NewsletterWriterAgent", async () => {
    await assertOutput("newsletter-writer", () => NewsletterWriterAgent.instance.run(newsletterInput));
  });

  it("NewsletterPersonalizationAgent", async () => {
    await assertOutput("newsletter-personalization", () => NewsletterPersonalizationAgent.instance.run(newsletterInput));
  });

  it("NewsletterSchedulerAgent", async () => {
    await assertOutput("newsletter-scheduler", () => NewsletterSchedulerAgent.instance.run(newsletterInput));
  });

  it("NewsletterMonetizationAgent", async () => {
    await assertOutput("newsletter-monetization", () => NewsletterMonetizationAgent.instance.run(newsletterInput));
  });

  it("NewsletterAnalyticsAgent", async () => {
    await assertOutput("newsletter-analytics", () => NewsletterAnalyticsAgent.instance.run(newsletterInput));
  });

  it("NewsletterGrowthAgent", async () => {
    await assertOutput("newsletter-growth", () => NewsletterGrowthAgent.instance.run(newsletterInput));
  });

  it("NewsletterABTestAgent", async () => {
    await assertOutput("newsletter-abtest", () => NewsletterABTestAgent.instance.run(newsletterInput));
  });

  it("NewsletterChurnAgent", async () => {
    await assertOutput("newsletter-churn", () => NewsletterChurnAgent.instance.run(newsletterInput));
  });
});
