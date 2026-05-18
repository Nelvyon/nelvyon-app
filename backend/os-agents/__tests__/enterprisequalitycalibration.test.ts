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
  EnterpriseQualityAuditAgent,
  EnterpriseQualityBenchmarkAgent,
  EnterpriseQualityCalibrationAgent,
  EnterpriseQualityImprovementAgent,
  EnterpriseQualityRejectorAgent,
  EnterpriseQualityReportAgent,
  EnterpriseQualityReviewerAgent,
  EnterpriseQualityScoreAgent,
  resetAllEnterpriseQualityCalibrationAgentsForTests,
} from "../sectors/enterprisequalitycalibration";

const EQ_JSON = JSON.stringify({
  content: "EnterpriseQuality: min 85, auto reject <85, top 1% benchmark, >10% audit, 24h calibration, zero generic.",
  score: 91,
  highlights: ["Min 85", "Top 1% benchmark", ">10% audit"],
  metrics: ["Quality score"],
});

const enterpriseQualityCalibrationInput = {
  userId: "00000000-0000-0000-0000-00000000eq01",
  sector: "enterprise",
  brand: "Enterprise demo",
  calibrationBrief: "Global outputs · brand tone",
  metricsBrief: "Score · reject rate · drift",
};

type EnterpriseQualityCalibrationOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("EnterpriseQualityCalibration agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(EQ_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllEnterpriseQualityCalibrationAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as EnterpriseQualityCalibrationOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("EnterpriseQualityScoreAgent", async () => {
    await assertOutput("enterprisequalitycalibration-score", () =>
      EnterpriseQualityScoreAgent.instance.run(enterpriseQualityCalibrationInput),
    );
  });

  it("EnterpriseQualityBenchmarkAgent", async () => {
    await assertOutput("enterprisequalitycalibration-benchmark", () =>
      EnterpriseQualityBenchmarkAgent.instance.run(enterpriseQualityCalibrationInput),
    );
  });

  it("EnterpriseQualityReviewerAgent", async () => {
    await assertOutput("enterprisequalitycalibration-reviewer", () =>
      EnterpriseQualityReviewerAgent.instance.run(enterpriseQualityCalibrationInput),
    );
  });

  it("EnterpriseQualityRejectorAgent", async () => {
    await assertOutput("enterprisequalitycalibration-rejector", () =>
      EnterpriseQualityRejectorAgent.instance.run(enterpriseQualityCalibrationInput),
    );
  });

  it("EnterpriseQualityCalibrationAgent", async () => {
    await assertOutput("enterprisequalitycalibration-calibration", () =>
      EnterpriseQualityCalibrationAgent.instance.run(enterpriseQualityCalibrationInput),
    );
  });

  it("EnterpriseQualityAuditAgent", async () => {
    await assertOutput("enterprisequalitycalibration-audit", () =>
      EnterpriseQualityAuditAgent.instance.run(enterpriseQualityCalibrationInput),
    );
  });

  it("EnterpriseQualityReportAgent", async () => {
    await assertOutput("enterprisequalitycalibration-report", () =>
      EnterpriseQualityReportAgent.instance.run(enterpriseQualityCalibrationInput),
    );
  });

  it("EnterpriseQualityImprovementAgent", async () => {
    await assertOutput("enterprisequalitycalibration-improvement", () =>
      EnterpriseQualityImprovementAgent.instance.run(enterpriseQualityCalibrationInput),
    );
  });
});
