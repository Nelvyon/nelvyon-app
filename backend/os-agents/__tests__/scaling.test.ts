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
  ScalingAnnualConversionAgent,
  ScalingDowngradeRiskAgent,
  ScalingExpansionRevenueAgent,
  ScalingFrictionReducerAgent,
  ScalingPricingAnchorAgent,
  ScalingTimingOptimizerAgent,
  ScalingUpgradeProposerAgent,
  ScalingUsageAnalyzerAgent,
  resetAllScalingAgentsForTests,
} from "../sectors/scaling";

const SCALING_JSON = JSON.stringify({
  content: "EXPAND: Evaluate, eXamine, Propose, Accelerate, Nurture, Drive aplicado.",
  score: 86,
  recommendation: "Ofrecer upgrade a tier Enterprise antes del pico de facturación con ROI explícito.",
  triggers: ["Uso API >85% del cupo", "Nuevos seats en 30d", "Soporte priority solicitado"],
});

const scalingInput = {
  userId: "00000000-0000-0000-0000-00000000aadd",
  sector: "saas",
  currentPlan: "pro",
  usageMetrics: { api_calls_pct: "88", seats_used: "45" },
  monthsActive: 8,
  mrr: "1200 EUR",
};

describe("Scaling agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SCALING_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllScalingAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertScalingOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      recommendation: string;
      triggers: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(typeof out.recommendation).toBe("string");
    expect(out.recommendation.length).toBeGreaterThan(0);
    expect(out.triggers.length).toBeGreaterThanOrEqual(1);
  }

  it("ScalingUsageAnalyzerAgent", async () => {
    await assertScalingOutput("scaling-usage-analyzer", () => ScalingUsageAnalyzerAgent.instance.run(scalingInput));
  });

  it("ScalingUpgradeProposerAgent", async () => {
    await assertScalingOutput("scaling-upgrade-proposer", () => ScalingUpgradeProposerAgent.instance.run(scalingInput));
  });

  it("ScalingPricingAnchorAgent", async () => {
    await assertScalingOutput("scaling-pricing-anchor", () => ScalingPricingAnchorAgent.instance.run(scalingInput));
  });

  it("ScalingFrictionReducerAgent", async () => {
    await assertScalingOutput("scaling-friction-reducer", () => ScalingFrictionReducerAgent.instance.run(scalingInput));
  });

  it("ScalingTimingOptimizerAgent", async () => {
    await assertScalingOutput("scaling-timing-optimizer", () => ScalingTimingOptimizerAgent.instance.run(scalingInput));
  });

  it("ScalingDowngradeRiskAgent", async () => {
    await assertScalingOutput("scaling-downgrade-risk", () => ScalingDowngradeRiskAgent.instance.run(scalingInput));
  });

  it("ScalingAnnualConversionAgent", async () => {
    await assertScalingOutput("scaling-annual-conversion", () => ScalingAnnualConversionAgent.instance.run(scalingInput));
  });

  it("ScalingExpansionRevenueAgent", async () => {
    await assertScalingOutput("scaling-expansion-revenue", () => ScalingExpansionRevenueAgent.instance.run(scalingInput));
  });
});
