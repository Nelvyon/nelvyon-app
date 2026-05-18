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
  AccountScoringAgent,
  BuyerIntentAgent,
  CompetitorIntelAgent,
  DealIntelligenceAgent,
  MarketIntelAgent,
  ProspectResearchAgent,
  SalesPlaybookAgent,
  SalesSignalAgent,
  resetAllSalesIntelligenceAgentsForTests,
} from "../sectors/salesintelligence";

const SI_JSON = JSON.stringify({
  content:
    "Sales intelligence: intent <2 min, scoring >88%, research 360° <60 s, deal risk >85%, cycle -35%, 0 humano.",
  score: 94,
  highlights: ["<2 min intent", ">88% scoring", "360° <60 s"],
  metrics: ["Buyer intent latency"],
});

const salesIntelligenceInput = {
  userId: "00000000-0000-0000-0000-00000000si01",
  sector: "saas",
  brand: "SaaS demo",
  salesIntelligenceBrief: "Sales intelligence · buyer intent",
  metricsBrief: "Intent · scoring · deal risk",
};

type SalesIntelligenceOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SalesIntelligence agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SI_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSalesIntelligenceAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SalesIntelligenceOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("BuyerIntentAgent", async () => {
    await assertOutput("salesintelligence-buyerintent", () => BuyerIntentAgent.instance.run(salesIntelligenceInput));
  });

  it("AccountScoringAgent", async () => {
    await assertOutput("salesintelligence-accountscoring", () =>
      AccountScoringAgent.instance.run(salesIntelligenceInput),
    );
  });

  it("SalesSignalAgent", async () => {
    await assertOutput("salesintelligence-salessignal", () => SalesSignalAgent.instance.run(salesIntelligenceInput));
  });

  it("CompetitorIntelAgent", async () => {
    await assertOutput("salesintelligence-competitorintel", () =>
      CompetitorIntelAgent.instance.run(salesIntelligenceInput),
    );
  });

  it("ProspectResearchAgent", async () => {
    await assertOutput("salesintelligence-prospectresearch", () =>
      ProspectResearchAgent.instance.run(salesIntelligenceInput),
    );
  });

  it("DealIntelligenceAgent", async () => {
    await assertOutput("salesintelligence-dealintelligence", () =>
      DealIntelligenceAgent.instance.run(salesIntelligenceInput),
    );
  });

  it("MarketIntelAgent", async () => {
    await assertOutput("salesintelligence-marketintel", () => MarketIntelAgent.instance.run(salesIntelligenceInput));
  });

  it("SalesPlaybookAgent", async () => {
    await assertOutput("salesintelligence-salesplaybook", () =>
      SalesPlaybookAgent.instance.run(salesIntelligenceInput),
    );
  });
});
