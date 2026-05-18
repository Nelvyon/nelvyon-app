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
  SuperiorChurnHealthScoreAgent,
  SuperiorChurnInterventionAgent,
  SuperiorChurnPlaybookAgent,
  SuperiorChurnPredictorAgent,
  SuperiorChurnRevenueImpactAgent,
  SuperiorChurnSegmentAgent,
  SuperiorChurnSignalsAgent,
  SuperiorChurnWinbackAgent,
  resetAllSuperiorChurnAgentsForTests,
} from "../sectors/superiorchurn";

const SCH_JSON = JSON.stringify({
  content: "SuperiorChurn: >85% @30d, health <5m, win-back >25%, MRR risk daily, intervene <15m.",
  score: 91,
  highlights: [">85% accuracy", "Health <5m", "Win-back >25%"],
  metrics: ["MRR at risk"],
});

const superiorChurnInput = {
  userId: "00000000-0000-0000-0000-00000000ch01",
  sector: "saas",
  brand: "SaaS retention",
  churnBrief: "Cohorte enterprise Q3",
  metricsBrief: "Churn rate NRR",
};

type SuperiorChurnOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorChurn agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SCH_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorChurnAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorChurnOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorChurnPredictorAgent", async () => {
    await assertOutput("superiorchurn-predictor", () => SuperiorChurnPredictorAgent.instance.run(superiorChurnInput));
  });

  it("SuperiorChurnSignalsAgent", async () => {
    await assertOutput("superiorchurn-signals", () => SuperiorChurnSignalsAgent.instance.run(superiorChurnInput));
  });

  it("SuperiorChurnSegmentAgent", async () => {
    await assertOutput("superiorchurn-segment", () => SuperiorChurnSegmentAgent.instance.run(superiorChurnInput));
  });

  it("SuperiorChurnPlaybookAgent", async () => {
    await assertOutput("superiorchurn-playbook", () => SuperiorChurnPlaybookAgent.instance.run(superiorChurnInput));
  });

  it("SuperiorChurnWinbackAgent", async () => {
    await assertOutput("superiorchurn-winback", () => SuperiorChurnWinbackAgent.instance.run(superiorChurnInput));
  });

  it("SuperiorChurnHealthScoreAgent", async () => {
    await assertOutput("superiorchurn-healthscore", () => SuperiorChurnHealthScoreAgent.instance.run(superiorChurnInput));
  });

  it("SuperiorChurnRevenueImpactAgent", async () => {
    await assertOutput("superiorchurn-revenueimpact", () =>
      SuperiorChurnRevenueImpactAgent.instance.run(superiorChurnInput),
    );
  });

  it("SuperiorChurnInterventionAgent", async () => {
    await assertOutput("superiorchurn-intervention", () => SuperiorChurnInterventionAgent.instance.run(superiorChurnInput));
  });
});
