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
  CallCoachingAgent,
  CallTranscriptionAgent,
  CompetitorMentionAgent,
  DealRiskAgent,
  NextStepAgent,
  RevenueForecasterAgent,
  TalkRatioAgent,
  WinLossAgent,
  resetAllRevenueIntelligenceAgentsForTests,
} from "../sectors/revenueintelligence";

const RI_JSON = JSON.stringify({
  content:
    "Revenue intelligence: transcripción <1 s, deal risk RT, win/loss <5 min, forecast >93%, CRM <30 s, 0 manual.",
  score: 95,
  highlights: ["<1 s transcribe", "Deal risk RT", "CRM <30 s"],
  metrics: ["Transcription latency"],
});

const revenueIntelligenceInput = {
  userId: "00000000-0000-0000-0000-00000000ri01",
  sector: "saas",
  brand: "SaaS demo",
  revenueIntelligenceBrief: "Revenue intelligence · llamadas",
  metricsBrief: "Transcripción · forecast · CRM",
};

type RevenueIntelligenceOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("RevenueIntelligence agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(RI_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllRevenueIntelligenceAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as RevenueIntelligenceOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("CallTranscriptionAgent", async () => {
    await assertOutput("revenueintelligence-calltranscription", () =>
      CallTranscriptionAgent.instance.run(revenueIntelligenceInput),
    );
  });

  it("DealRiskAgent", async () => {
    await assertOutput("revenueintelligence-dealrisk", () => DealRiskAgent.instance.run(revenueIntelligenceInput));
  });

  it("WinLossAgent", async () => {
    await assertOutput("revenueintelligence-winloss", () => WinLossAgent.instance.run(revenueIntelligenceInput));
  });

  it("CallCoachingAgent", async () => {
    await assertOutput("revenueintelligence-callcoaching", () =>
      CallCoachingAgent.instance.run(revenueIntelligenceInput),
    );
  });

  it("RevenueForecasterAgent", async () => {
    await assertOutput("revenueintelligence-revenueforecaster", () =>
      RevenueForecasterAgent.instance.run(revenueIntelligenceInput),
    );
  });

  it("CompetitorMentionAgent", async () => {
    await assertOutput("revenueintelligence-competitormention", () =>
      CompetitorMentionAgent.instance.run(revenueIntelligenceInput),
    );
  });

  it("TalkRatioAgent", async () => {
    await assertOutput("revenueintelligence-talkratio", () => TalkRatioAgent.instance.run(revenueIntelligenceInput));
  });

  it("NextStepAgent", async () => {
    await assertOutput("revenueintelligence-nextstep", () => NextStepAgent.instance.run(revenueIntelligenceInput));
  });
});
