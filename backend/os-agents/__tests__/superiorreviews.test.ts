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
  SuperiorReviewsAlertAgent,
  SuperiorReviewsCollectorAgent,
  SuperiorReviewsCompetitorAgent,
  SuperiorReviewsDistributionAgent,
  SuperiorReviewsInsightsAgent,
  SuperiorReviewsReputationAgent,
  SuperiorReviewsResponseAgent,
  SuperiorReviewsSentimentAgent,
  resetAllSuperiorReviewsAgentsForTests,
} from "../sectors/superiorreviews";

const SR_JSON = JSON.stringify({
  content: "SuperiorReviews: >35% collection, <5m negative reply, >4.7 stars, >92% sentiment, 5+ platforms.",
  score: 91,
  highlights: [">35% collection", "<5m response", ">4.7 rating"],
  metrics: ["Collection rate"],
});

const superiorReviewsInput = {
  userId: "00000000-0000-0000-0000-00000000rv01",
  sector: "hospitality",
  brand: "Hotel demo",
  reviewsBrief: "Post-stay Google + Tripadvisor",
  metricsBrief: "Rating NPS",
};

type SuperiorReviewsOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorReviews agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SR_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorReviewsAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorReviewsOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorReviewsCollectorAgent", async () => {
    await assertOutput("superiorreviews-collector", () => SuperiorReviewsCollectorAgent.instance.run(superiorReviewsInput));
  });

  it("SuperiorReviewsSentimentAgent", async () => {
    await assertOutput("superiorreviews-sentiment", () => SuperiorReviewsSentimentAgent.instance.run(superiorReviewsInput));
  });

  it("SuperiorReviewsResponseAgent", async () => {
    await assertOutput("superiorreviews-response", () => SuperiorReviewsResponseAgent.instance.run(superiorReviewsInput));
  });

  it("SuperiorReviewsAlertAgent", async () => {
    await assertOutput("superiorreviews-alert", () => SuperiorReviewsAlertAgent.instance.run(superiorReviewsInput));
  });

  it("SuperiorReviewsDistributionAgent", async () => {
    await assertOutput("superiorreviews-distribution", () =>
      SuperiorReviewsDistributionAgent.instance.run(superiorReviewsInput),
    );
  });

  it("SuperiorReviewsInsightsAgent", async () => {
    await assertOutput("superiorreviews-insights", () => SuperiorReviewsInsightsAgent.instance.run(superiorReviewsInput));
  });

  it("SuperiorReviewsCompetitorAgent", async () => {
    await assertOutput("superiorreviews-competitor", () => SuperiorReviewsCompetitorAgent.instance.run(superiorReviewsInput));
  });

  it("SuperiorReviewsReputationAgent", async () => {
    await assertOutput("superiorreviews-reputation", () => SuperiorReviewsReputationAgent.instance.run(superiorReviewsInput));
  });
});
