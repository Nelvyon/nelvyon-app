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
  TestimonialsCaseStudyBuilderAgent,
  TestimonialsComparisonAgent,
  TestimonialsDistributionAgent,
  TestimonialsOutreachRequestAgent,
  TestimonialsQuoteExtractorAgent,
  TestimonialsROICalculatorAgent,
  TestimonialsSocialProofAgent,
  TestimonialsVideoScriptAgent,
  resetAllTestimonialsAgentsForTests,
} from "../sectors/testimonials";

const TESTIMONIALS_JSON = JSON.stringify({
  content: "PROOF: Problem, Result, Outcome, Outcome-specific, Facts aplicado.",
  score: 90,
  quotes: ["Pasamos de dudar a escalar en 90 días.", "El equipo cerró el loop con datos reales."],
  formats: ["One-pager PDF", "Carrusel LinkedIn", "Clip 60s"],
});

const testimonialsInput = {
  userId: "00000000-0000-0000-0000-0000000088bb",
  sector: "saas",
  clientName: "Acme Corp",
  result: "ARR +18% YoY",
  industry: "logística",
  challenge: "Datos fragmentados",
  solution: "Unificación en data warehouse",
};

describe("Testimonials agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(TESTIMONIALS_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllTestimonialsAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertTestimonialsOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      quotes: string[];
      formats: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.quotes.length).toBeGreaterThanOrEqual(1);
    expect(out.formats.length).toBeGreaterThanOrEqual(1);
  }

  it("TestimonialsCaseStudyBuilderAgent", async () => {
    await assertTestimonialsOutput("testimonials-case-study-builder", () =>
      TestimonialsCaseStudyBuilderAgent.instance.run(testimonialsInput),
    );
  });

  it("TestimonialsQuoteExtractorAgent", async () => {
    await assertTestimonialsOutput("testimonials-quote-extractor", () =>
      TestimonialsQuoteExtractorAgent.instance.run(testimonialsInput),
    );
  });

  it("TestimonialsVideoScriptAgent", async () => {
    await assertTestimonialsOutput("testimonials-video-script", () =>
      TestimonialsVideoScriptAgent.instance.run(testimonialsInput),
    );
  });

  it("TestimonialsSocialProofAgent", async () => {
    await assertTestimonialsOutput("testimonials-social-proof", () =>
      TestimonialsSocialProofAgent.instance.run(testimonialsInput),
    );
  });

  it("TestimonialsOutreachRequestAgent", async () => {
    await assertTestimonialsOutput("testimonials-outreach-request", () =>
      TestimonialsOutreachRequestAgent.instance.run(testimonialsInput),
    );
  });

  it("TestimonialsROICalculatorAgent", async () => {
    await assertTestimonialsOutput("testimonials-roi-calculator", () =>
      TestimonialsROICalculatorAgent.instance.run(testimonialsInput),
    );
  });

  it("TestimonialsComparisonAgent", async () => {
    await assertTestimonialsOutput("testimonials-comparison", () =>
      TestimonialsComparisonAgent.instance.run(testimonialsInput),
    );
  });

  it("TestimonialsDistributionAgent", async () => {
    await assertTestimonialsOutput("testimonials-distribution", () =>
      TestimonialsDistributionAgent.instance.run(testimonialsInput),
    );
  });
});
