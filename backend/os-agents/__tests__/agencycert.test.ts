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
  AgencyCertAnalyticsAgent,
  AgencyCertApplicationAgent,
  AgencyCertBadgeAgent,
  AgencyCertEvaluatorAgent,
  AgencyCertLeaderboardAgent,
  AgencyCertRenewalAgent,
  AgencyCertRewardsAgent,
  AgencyCertTrainingAgent,
  resetAllAgencyCertAgentsForTests,
} from "../sectors/agencycert";

const AC_JSON = JSON.stringify({
  content:
    "Certificación Gold: NPS 8.6, 28 clientes; renovación anual; Platinum = 40% + white-label + beta.",
  score: 90,
  highlights: ["Silver/Gold/Platinum", "Renovación auto", "Badge URL"],
  metrics: ["nivel: gold"],
});

const agencyCertInput = {
  userId: "00000000-0000-0000-0000-00000000ac01",
  sector: "partner_agency",
  brand: "Partner Demo",
  agencyId: "00000000-0000-0000-0000-00000000a101",
  countryCode: "ES",
  targetLevel: "gold" as const,
  metricsBrief: "28 clientes, NPS 8.6, 14 meses",
};

type AgencyCertOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("AgencyCert agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AC_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllAgencyCertAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as AgencyCertOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("AgencyCertApplicationAgent", async () => {
    await assertOutput("agencycert-application", () => AgencyCertApplicationAgent.instance.run(agencyCertInput));
  });

  it("AgencyCertEvaluatorAgent", async () => {
    await assertOutput("agencycert-evaluator", () => AgencyCertEvaluatorAgent.instance.run(agencyCertInput));
  });

  it("AgencyCertBadgeAgent", async () => {
    await assertOutput("agencycert-badge", () => AgencyCertBadgeAgent.instance.run(agencyCertInput));
  });

  it("AgencyCertTrainingAgent", async () => {
    await assertOutput("agencycert-training", () => AgencyCertTrainingAgent.instance.run(agencyCertInput));
  });

  it("AgencyCertRenewalAgent", async () => {
    await assertOutput("agencycert-renewal", () => AgencyCertRenewalAgent.instance.run(agencyCertInput));
  });

  it("AgencyCertLeaderboardAgent", async () => {
    await assertOutput("agencycert-leaderboard", () => AgencyCertLeaderboardAgent.instance.run(agencyCertInput));
  });

  it("AgencyCertRewardsAgent", async () => {
    await assertOutput("agencycert-rewards", () => AgencyCertRewardsAgent.instance.run(agencyCertInput));
  });

  it("AgencyCertAnalyticsAgent", async () => {
    await assertOutput("agencycert-analytics", () => AgencyCertAnalyticsAgent.instance.run(agencyCertInput));
  });
});
