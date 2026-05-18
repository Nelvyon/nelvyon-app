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
  ReviewsCompetitorBenchmarkAgent,
  ReviewsEscalationHandlerAgent,
  ReviewsPatternInsightAgent,
  ReviewsRepairStrategyAgent,
  ReviewsRequestCrafterAgent,
  ReviewsResponseGeneratorAgent,
  ReviewsSentimentAnalyzerAgent,
  ReviewsTestimonialExtractorAgent,
  resetAllReviewsAgentsForTests,
} from "../sectors/reviews";

const SAMPLE_JSON = JSON.stringify({
  content: "TRUST: Tone, Respond, Understand, Strengthen, Track aplicados.",
  score: 76,
  sentiment: "neutral",
  actions: [
    "Publicar respuesta en 24h con tono alineado a marca.",
    "Abrir ticket interno con categoría delivery.",
    "Medir CSAT post-respuesta en 7 días.",
  ],
});

const baseInput = {
  userId: "00000000-0000-0000-0000-0000000000dd",
  sector: "retail",
  businessName: "Acme Shop",
  platform: "google",
  reviewText: "Buen producto pero el envío fue lento.",
  rating: 3,
  language: "es",
};

const SENTIMENTS = new Set(["positive", "neutral", "negative"]);

describe("Reviews automáticos agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SAMPLE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllReviewsAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertValid(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      sentiment: string;
      actions: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(SENTIMENTS.has(out.sentiment)).toBe(true);
    expect(out.actions.length).toBeGreaterThanOrEqual(1);
  }

  it("ReviewsRequestCrafterAgent", async () => {
    await assertValid("reviews-request-crafter", () => ReviewsRequestCrafterAgent.instance.run(baseInput));
  });

  it("ReviewsSentimentAnalyzerAgent", async () => {
    await assertValid("reviews-sentiment-analyzer", () => ReviewsSentimentAnalyzerAgent.instance.run(baseInput));
  });

  it("ReviewsResponseGeneratorAgent", async () => {
    await assertValid("reviews-response-generator", () => ReviewsResponseGeneratorAgent.instance.run(baseInput));
  });

  it("ReviewsEscalationHandlerAgent", async () => {
    await assertValid("reviews-escalation-handler", () => ReviewsEscalationHandlerAgent.instance.run(baseInput));
  });

  it("ReviewsPatternInsightAgent", async () => {
    await assertValid("reviews-pattern-insight", () => ReviewsPatternInsightAgent.instance.run(baseInput));
  });

  it("ReviewsCompetitorBenchmarkAgent", async () => {
    await assertValid("reviews-competitor-benchmark", () => ReviewsCompetitorBenchmarkAgent.instance.run(baseInput));
  });

  it("ReviewsTestimonialExtractorAgent", async () => {
    await assertValid("reviews-testimonial-extractor", () => ReviewsTestimonialExtractorAgent.instance.run(baseInput));
  });

  it("ReviewsRepairStrategyAgent", async () => {
    await assertValid("reviews-repair-strategy", () => ReviewsRepairStrategyAgent.instance.run(baseInput));
  });
});
