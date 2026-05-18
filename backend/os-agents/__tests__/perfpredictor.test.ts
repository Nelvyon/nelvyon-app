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
  PerfPredictorBudgetAgent,
  PerfPredictorCalibrationAgent,
  PerfPredictorChannelAgent,
  PerfPredictorForecastAgent,
  PerfPredictorReportAgent,
  PerfPredictorRiskAgent,
  PerfPredictorSeasonAgent,
  PerfPredictorTrendAgent,
  resetAllPerfPredictorAgentsForTests,
} from "../sectors/perfpredictor";

const PP_JSON = JSON.stringify({
  content:
    "PerfPredictor: 30/60/90d CTR conv ROAS CI bands, seasonality BF, Meta freq>3.5 risk, channel mix.",
  score: 91,
  highlights: ["30d conf >85%", "Meta fatigue", "Season adjust"],
  metrics: ["Predicted ROAS"],
});

const perfPredictorInput = {
  userId: "00000000-0000-0000-0000-00000000pp01",
  sector: "ecommerce",
  brand: "Campaña Demo",
  campaignBrief: "ROAS objetivo 4x multicanal",
  metricsBrief: "Horizonte 90d",
};

type PerfPredictorOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("PerfPredictor agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PP_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllPerfPredictorAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as PerfPredictorOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("PerfPredictorForecastAgent", async () => {
    await assertOutput("perfpredictor-forecast", () => PerfPredictorForecastAgent.instance.run(perfPredictorInput));
  });

  it("PerfPredictorTrendAgent", async () => {
    await assertOutput("perfpredictor-trend", () => PerfPredictorTrendAgent.instance.run(perfPredictorInput));
  });

  it("PerfPredictorBudgetAgent", async () => {
    await assertOutput("perfpredictor-budget", () => PerfPredictorBudgetAgent.instance.run(perfPredictorInput));
  });

  it("PerfPredictorChannelAgent", async () => {
    await assertOutput("perfpredictor-channel", () => PerfPredictorChannelAgent.instance.run(perfPredictorInput));
  });

  it("PerfPredictorSeasonAgent", async () => {
    await assertOutput("perfpredictor-season", () => PerfPredictorSeasonAgent.instance.run(perfPredictorInput));
  });

  it("PerfPredictorRiskAgent", async () => {
    await assertOutput("perfpredictor-risk", () => PerfPredictorRiskAgent.instance.run(perfPredictorInput));
  });

  it("PerfPredictorCalibrationAgent", async () => {
    await assertOutput("perfpredictor-calibration", () => PerfPredictorCalibrationAgent.instance.run(perfPredictorInput));
  });

  it("PerfPredictorReportAgent", async () => {
    await assertOutput("perfpredictor-report", () => PerfPredictorReportAgent.instance.run(perfPredictorInput));
  });
});
