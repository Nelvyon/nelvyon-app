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
  SuperiorCrmAnalyticsAgent,
  SuperiorCrmAutomationAgent,
  SuperiorCrmEnrichmentAgent,
  SuperiorCrmForecastAgent,
  SuperiorCrmLeadScoringAgent,
  SuperiorCrmPersonalizationAgent,
  SuperiorCrmPipelineAgent,
  SuperiorCrmRetentionAgent,
  resetAllSuperiorCrmAgentsForTests,
} from "../sectors/superiorcrm";

const SC_JSON = JSON.stringify({
  content: "SuperiorCrm: win>35%, score>90%, forecast>92%, enrich>85%, churn>30d early.",
  score: 91,
  highlights: ["Win rate", "Forecast 92%", "Churn early"],
  metrics: ["Pipeline ACV"],
});

const superiorCrmInput = {
  userId: "00000000-0000-0000-0000-00000000sc01",
  sector: "saas",
  brand: "CRM NELVYON",
  crmBrief: "Pipeline enterprise Q3",
  metricsBrief: "Win rate cycle time",
};

type SuperiorCrmOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorCrm agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SC_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorCrmAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorCrmOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorCrmLeadScoringAgent", async () => {
    await assertOutput("superiorcrm-leadscoring", () => SuperiorCrmLeadScoringAgent.instance.run(superiorCrmInput));
  });

  it("SuperiorCrmPipelineAgent", async () => {
    await assertOutput("superiorcrm-pipeline", () => SuperiorCrmPipelineAgent.instance.run(superiorCrmInput));
  });

  it("SuperiorCrmPersonalizationAgent", async () => {
    await assertOutput("superiorcrm-personalization", () =>
      SuperiorCrmPersonalizationAgent.instance.run(superiorCrmInput),
    );
  });

  it("SuperiorCrmAutomationAgent", async () => {
    await assertOutput("superiorcrm-automation", () => SuperiorCrmAutomationAgent.instance.run(superiorCrmInput));
  });

  it("SuperiorCrmAnalyticsAgent", async () => {
    await assertOutput("superiorcrm-analytics", () => SuperiorCrmAnalyticsAgent.instance.run(superiorCrmInput));
  });

  it("SuperiorCrmEnrichmentAgent", async () => {
    await assertOutput("superiorcrm-enrichment", () => SuperiorCrmEnrichmentAgent.instance.run(superiorCrmInput));
  });

  it("SuperiorCrmRetentionAgent", async () => {
    await assertOutput("superiorcrm-retention", () => SuperiorCrmRetentionAgent.instance.run(superiorCrmInput));
  });

  it("SuperiorCrmForecastAgent", async () => {
    await assertOutput("superiorcrm-forecast", () => SuperiorCrmForecastAgent.instance.run(superiorCrmInput));
  });
});
