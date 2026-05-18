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
  ComplianceHRAgent,
  EngagementAgent,
  HRAnalyticsAgent,
  OnboardingHRAgent,
  PayrollAgent,
  PerformanceAgent,
  RecruitmentAgent,
  TrainingAgent,
  resetAllHrTechAgentsForTests,
} from "../sectors/hrtech";

const HR_JSON = JSON.stringify({
  content:
    "HR tech: screening <2 min, TTH - >50%, eNPS mensual, onboarding <1 d, 195 países, turnover - >30%.",
  score: 95,
  highlights: ["<2 min screening", "eNPS mensual", "195 países"],
  metrics: ["Time-to-hire"],
});

const hrTechInput = {
  userId: "00000000-0000-0000-0000-00000000hr01",
  sector: "rrhh",
  brand: "Empresa demo",
  hrTechBrief: "HR tech · reclutamiento",
  metricsBrief: "TTH · eNPS · turnover",
};

type HrTechOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("HrTech agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(HR_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllHrTechAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as HrTechOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("RecruitmentAgent", async () => {
    await assertOutput("hrtech-recruitment", () => RecruitmentAgent.instance.run(hrTechInput));
  });

  it("OnboardingHRAgent", async () => {
    await assertOutput("hrtech-onboardinghr", () => OnboardingHRAgent.instance.run(hrTechInput));
  });

  it("PerformanceAgent", async () => {
    await assertOutput("hrtech-performance", () => PerformanceAgent.instance.run(hrTechInput));
  });

  it("EngagementAgent", async () => {
    await assertOutput("hrtech-engagement", () => EngagementAgent.instance.run(hrTechInput));
  });

  it("PayrollAgent", async () => {
    await assertOutput("hrtech-payroll", () => PayrollAgent.instance.run(hrTechInput));
  });

  it("TrainingAgent", async () => {
    await assertOutput("hrtech-training", () => TrainingAgent.instance.run(hrTechInput));
  });

  it("ComplianceHRAgent", async () => {
    await assertOutput("hrtech-compliancehr", () => ComplianceHRAgent.instance.run(hrTechInput));
  });

  it("HRAnalyticsAgent", async () => {
    await assertOutput("hrtech-hranalytics", () => HRAnalyticsAgent.instance.run(hrTechInput));
  });
});
