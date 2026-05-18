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
  SuperiorCompetitiveAdsAgent,
  SuperiorCompetitiveAlertAgent,
  SuperiorCompetitiveBattlecardAgent,
  SuperiorCompetitiveContentAgent,
  SuperiorCompetitivePricingAgent,
  SuperiorCompetitiveReportAgent,
  SuperiorCompetitiveSentimentAgent,
  SuperiorCompetitiveTrackerAgent,
  resetAllSuperiorCompetitiveAgentsForTests,
} from "../sectors/superiorcompetitive";

const SC_JSON = JSON.stringify({
  content: "SuperiorCompetitive: <30m change detection, <2m battlecards, 10+ rivals, <5m alerts, +20% win rate.",
  score: 91,
  highlights: ["<30m detection", "<2m battlecards", "10+ competitors"],
  metrics: ["Change latency"],
});

const superiorCompetitiveInput = {
  userId: "00000000-0000-0000-0000-00000000cp01",
  sector: "saas",
  brand: "Acme demo",
  competitiveBrief: "10 rivales B2B · pricing y features",
  metricsBrief: "Win rate · alert SLA",
};

type SuperiorCompetitiveOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorCompetitive agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SC_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorCompetitiveAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorCompetitiveOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorCompetitiveTrackerAgent", async () => {
    await assertOutput("superiorcompetitive-tracker", () => SuperiorCompetitiveTrackerAgent.instance.run(superiorCompetitiveInput));
  });

  it("SuperiorCompetitiveBattlecardAgent", async () => {
    await assertOutput("superiorcompetitive-battlecard", () =>
      SuperiorCompetitiveBattlecardAgent.instance.run(superiorCompetitiveInput),
    );
  });

  it("SuperiorCompetitivePricingAgent", async () => {
    await assertOutput("superiorcompetitive-pricing", () => SuperiorCompetitivePricingAgent.instance.run(superiorCompetitiveInput));
  });

  it("SuperiorCompetitiveContentAgent", async () => {
    await assertOutput("superiorcompetitive-content", () => SuperiorCompetitiveContentAgent.instance.run(superiorCompetitiveInput));
  });

  it("SuperiorCompetitiveAdsAgent", async () => {
    await assertOutput("superiorcompetitive-ads", () => SuperiorCompetitiveAdsAgent.instance.run(superiorCompetitiveInput));
  });

  it("SuperiorCompetitiveSentimentAgent", async () => {
    await assertOutput("superiorcompetitive-sentiment", () =>
      SuperiorCompetitiveSentimentAgent.instance.run(superiorCompetitiveInput),
    );
  });

  it("SuperiorCompetitiveAlertAgent", async () => {
    await assertOutput("superiorcompetitive-alert", () => SuperiorCompetitiveAlertAgent.instance.run(superiorCompetitiveInput));
  });

  it("SuperiorCompetitiveReportAgent", async () => {
    await assertOutput("superiorcompetitive-report", () => SuperiorCompetitiveReportAgent.instance.run(superiorCompetitiveInput));
  });
});
