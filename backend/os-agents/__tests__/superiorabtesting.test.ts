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
  SuperiorABTestingDesignAgent,
  SuperiorABTestingHypothesisAgent,
  SuperiorABTestingInsightsAgent,
  SuperiorABTestingPersonalizationAgent,
  SuperiorABTestingReportAgent,
  SuperiorABTestingRolloutAgent,
  SuperiorABTestingRunnerAgent,
  SuperiorABTestingStatAgent,
  resetAllSuperiorABTestingAgentsForTests,
} from "../sectors/superiorabtesting";

const AB_JSON = JSON.stringify({
  content: "SuperiorABTesting: 95% significance, <5m launch, auto winner, <2m rollout, 10+ tests, real-time revenue.",
  score: 91,
  highlights: ["95% significance", "<5m launch", "<2m rollout"],
  metrics: ["Statistical power"],
});

const superiorABTestingInput = {
  userId: "00000000-0000-0000-0000-00000000ab01",
  sector: "ecommerce",
  brand: "Ecommerce demo",
  testingBrief: "Checkout CTA · pricing page",
  metricsBrief: "CVR · revenue impact",
};

type SuperiorABTestingOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorABTesting agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AB_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorABTestingAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorABTestingOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorABTestingHypothesisAgent", async () => {
    await assertOutput("superiorabtesting-hypothesis", () =>
      SuperiorABTestingHypothesisAgent.instance.run(superiorABTestingInput),
    );
  });

  it("SuperiorABTestingDesignAgent", async () => {
    await assertOutput("superiorabtesting-design", () => SuperiorABTestingDesignAgent.instance.run(superiorABTestingInput));
  });

  it("SuperiorABTestingRunnerAgent", async () => {
    await assertOutput("superiorabtesting-runner", () => SuperiorABTestingRunnerAgent.instance.run(superiorABTestingInput));
  });

  it("SuperiorABTestingStatAgent", async () => {
    await assertOutput("superiorabtesting-stat", () => SuperiorABTestingStatAgent.instance.run(superiorABTestingInput));
  });

  it("SuperiorABTestingPersonalizationAgent", async () => {
    await assertOutput("superiorabtesting-personalization", () =>
      SuperiorABTestingPersonalizationAgent.instance.run(superiorABTestingInput),
    );
  });

  it("SuperiorABTestingInsightsAgent", async () => {
    await assertOutput("superiorabtesting-insights", () =>
      SuperiorABTestingInsightsAgent.instance.run(superiorABTestingInput),
    );
  });

  it("SuperiorABTestingRolloutAgent", async () => {
    await assertOutput("superiorabtesting-rollout", () => SuperiorABTestingRolloutAgent.instance.run(superiorABTestingInput));
  });

  it("SuperiorABTestingReportAgent", async () => {
    await assertOutput("superiorabtesting-report", () => SuperiorABTestingReportAgent.instance.run(superiorABTestingInput));
  });
});
