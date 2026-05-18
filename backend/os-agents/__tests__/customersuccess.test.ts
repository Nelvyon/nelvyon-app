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
  ChurnRiskAgent,
  CustomerROIAgent,
  EscalationAgent,
  ExpansionAgent,
  HealthScoreAgent,
  OnboardingSuccessAgent,
  PlaybookCSAgent,
  QBRAgent,
  resetAllCustomerSuccessAgentsForTests,
} from "../sectors/customersuccess";

const CS_JSON = JSON.stringify({
  content:
    "Customer success: health <5 min, churn >90%, TTFV <24 h, expansión >25%, NPS >70, 0 humano onboarding/seguimiento.",
  score: 94,
  highlights: ["Health <5 min", ">90% churn", "NPS >70"],
  metrics: ["Health score latency"],
});

const customerSuccessInput = {
  userId: "00000000-0000-0000-0000-00000000cs01",
  sector: "saas",
  brand: "SaaS demo",
  customerSuccessBrief: "Customer success · health scores",
  metricsBrief: "Health · churn · NPS",
};

type CustomerSuccessOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("CustomerSuccess agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CS_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllCustomerSuccessAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as CustomerSuccessOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("HealthScoreAgent", async () => {
    await assertOutput("customersuccess-healthscore", () => HealthScoreAgent.instance.run(customerSuccessInput));
  });

  it("ChurnRiskAgent", async () => {
    await assertOutput("customersuccess-churnrisk", () => ChurnRiskAgent.instance.run(customerSuccessInput));
  });

  it("OnboardingSuccessAgent", async () => {
    await assertOutput("customersuccess-onboardingsuccess", () =>
      OnboardingSuccessAgent.instance.run(customerSuccessInput),
    );
  });

  it("ExpansionAgent", async () => {
    await assertOutput("customersuccess-expansion", () => ExpansionAgent.instance.run(customerSuccessInput));
  });

  it("QBRAgent", async () => {
    await assertOutput("customersuccess-qbr", () => QBRAgent.instance.run(customerSuccessInput));
  });

  it("PlaybookCSAgent", async () => {
    await assertOutput("customersuccess-playbookcs", () => PlaybookCSAgent.instance.run(customerSuccessInput));
  });

  it("CustomerROIAgent", async () => {
    await assertOutput("customersuccess-customerroi", () => CustomerROIAgent.instance.run(customerSuccessInput));
  });

  it("EscalationAgent", async () => {
    await assertOutput("customersuccess-escalation", () => EscalationAgent.instance.run(customerSuccessInput));
  });
});
