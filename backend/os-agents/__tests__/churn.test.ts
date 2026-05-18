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
  ChurnEscalationTriggerAgent,
  ChurnReengagementSequenceAgent,
  ChurnRetentionOfferAgent,
  ChurnRiskScorerAgent,
  ChurnRootCauseAnalystAgent,
  ChurnSegmentClassifierAgent,
  ChurnSignalDetectorAgent,
  ChurnSuccessStoryAgent,
  resetAllChurnAgentsForTests,
} from "../sectors/churn";

const SAMPLE_JSON = JSON.stringify({
  content: "RETAIN: Risk, Evidence, Trigger, Action, Impact, Nurture sintetizado.",
  score: 68,
  riskLevel: "high",
  actions: [
    "Llamada CSM en 24h con checklist de valor.",
    "Email con caso peer y CTA a sesión de configuración.",
    "Flag en CRM para oferta retención si no hay respuesta en 72h.",
  ],
});

const baseInput = {
  userId: "00000000-0000-0000-0000-0000000000cc",
  sector: "saas",
  contactId: "c-42",
  engagementData: { sessions_30d: "3", last_login_days: "18" },
  planType: "growth",
  monthsActive: 14,
};

const LEVELS = new Set(["low", "medium", "high", "critical"]);

describe("Churn prediction agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SAMPLE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllChurnAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertValid(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      riskLevel: string;
      actions: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(LEVELS.has(out.riskLevel)).toBe(true);
    expect(out.actions.length).toBeGreaterThanOrEqual(1);
  }

  it("ChurnRiskScorerAgent", async () => {
    await assertValid("churn-risk-scorer", () => ChurnRiskScorerAgent.instance.run(baseInput));
  });

  it("ChurnSignalDetectorAgent", async () => {
    await assertValid("churn-signal-detector", () => ChurnSignalDetectorAgent.instance.run(baseInput));
  });

  it("ChurnSegmentClassifierAgent", async () => {
    await assertValid("churn-segment-classifier", () => ChurnSegmentClassifierAgent.instance.run(baseInput));
  });

  it("ChurnRetentionOfferAgent", async () => {
    await assertValid("churn-retention-offer", () => ChurnRetentionOfferAgent.instance.run(baseInput));
  });

  it("ChurnReengagementSequenceAgent", async () => {
    await assertValid("churn-reengagement-sequence", () => ChurnReengagementSequenceAgent.instance.run(baseInput));
  });

  it("ChurnRootCauseAnalystAgent", async () => {
    await assertValid("churn-root-cause-analyst", () => ChurnRootCauseAnalystAgent.instance.run(baseInput));
  });

  it("ChurnSuccessStoryAgent", async () => {
    await assertValid("churn-success-story", () => ChurnSuccessStoryAgent.instance.run(baseInput));
  });

  it("ChurnEscalationTriggerAgent", async () => {
    await assertValid("churn-escalation-trigger", () => ChurnEscalationTriggerAgent.instance.run(baseInput));
  });
});
