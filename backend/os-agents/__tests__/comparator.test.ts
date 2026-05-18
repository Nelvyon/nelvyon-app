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
  ComparatorBenchmarkAgent,
  ComparatorMetricsNarratorAgent,
  ComparatorPDFSummaryAgent,
  ComparatorROICalculatorAgent,
  ComparatorSocialShareAgent,
  ComparatorTestimonialMinerAgent,
  ComparatorUpsellTriggerAgent,
  ComparatorVisualStoryAgent,
  resetAllComparatorAgentsForTests,
} from "../sectors/comparator";

const COMPARATOR_JSON = JSON.stringify({
  content:
    "TRANSFORM: Then baseline honesto. Results alineados al brief. Achieved logros medibles. Numbers del cliente. Show lectura ejecutiva. Frame impacto. Own límites. Result síntesis. More siguiente paso.",
  score: 88,
  improvements: ["CAC −22%", "Pipeline +18%"],
  visualData: ["CAC 120→94€", "Win rate 12%→15%"],
});

const comparatorInput = {
  userId: "00000000-0000-0000-0000-00000000c0mp",
  sector: "saas",
  clientName: "Acme Labs",
  beforeMetrics: { CAC: "120€", MRR: "48k" },
  afterMetrics: { CAC: "94€", MRR: "62k" },
  period: "90 días",
};

describe("Comparator agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(COMPARATOR_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllComparatorAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertComparatorOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      improvements: string[];
      visualData: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.improvements.length).toBeGreaterThanOrEqual(1);
    expect(out.visualData.length).toBeGreaterThanOrEqual(1);
  }

  it("ComparatorMetricsNarratorAgent", async () => {
    await assertComparatorOutput("comparator-metrics-narrator", () => ComparatorMetricsNarratorAgent.instance.run(comparatorInput));
  });

  it("ComparatorROICalculatorAgent", async () => {
    await assertComparatorOutput("comparator-roi-calculator", () => ComparatorROICalculatorAgent.instance.run(comparatorInput));
  });

  it("ComparatorVisualStoryAgent", async () => {
    await assertComparatorOutput("comparator-visual-story", () => ComparatorVisualStoryAgent.instance.run(comparatorInput));
  });

  it("ComparatorBenchmarkAgent", async () => {
    await assertComparatorOutput("comparator-benchmark", () => ComparatorBenchmarkAgent.instance.run(comparatorInput));
  });

  it("ComparatorSocialShareAgent", async () => {
    await assertComparatorOutput("comparator-social-share", () => ComparatorSocialShareAgent.instance.run(comparatorInput));
  });

  it("ComparatorPDFSummaryAgent", async () => {
    await assertComparatorOutput("comparator-pdf-summary", () => ComparatorPDFSummaryAgent.instance.run(comparatorInput));
  });

  it("ComparatorUpsellTriggerAgent", async () => {
    await assertComparatorOutput("comparator-upsell-trigger", () => ComparatorUpsellTriggerAgent.instance.run(comparatorInput));
  });

  it("ComparatorTestimonialMinerAgent", async () => {
    await assertComparatorOutput("comparator-testimonial-miner", () => ComparatorTestimonialMinerAgent.instance.run(comparatorInput));
  });
});
