// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  SaasB2bAnalyticsAgent,
  SaasB2bDemoAgent,
  SaasB2bEmailAgent,
  SaasB2bLeadGenAgent,
  SaasB2bOnboardingAgent,
  SaasB2bReviewsAgent,
  SaasB2bSEOAgent,
  SaasB2bSocialAgent,
  resetAllSaasB2bAgentsForTests,
} from "../sectors/saasb2b";

const SB_JSON = JSON.stringify({
  result: "SaaS B2B: demos, lead gen, onboarding y analytics.",
  score: 93,
  recommendations: ["Trials automatizados", "LinkedIn ABM", "MRR tracking"],
});

const saasB2bInput = {
  userId: "00000000-0000-0000-0000-00000000sb01",
  businessName: "SaaS demo",
  services: ["PLG", "enterprise sales"],
  targets: ["SMB", "mid-market"],
};

describe("SaasB2b agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SB_JSON);
    resetAllSaasB2bAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("SaasB2bDemoAgent", async () => {
    await assertOutput("saasb2b-demo", () => SaasB2bDemoAgent.instance.run(saasB2bInput));
  });

  it("SaasB2bLeadGenAgent", async () => {
    await assertOutput("saasb2b-leadgen", () => SaasB2bLeadGenAgent.instance.run(saasB2bInput));
  });

  it("SaasB2bOnboardingAgent", async () => {
    await assertOutput("saasb2b-onboarding", () => SaasB2bOnboardingAgent.instance.run(saasB2bInput));
  });

  it("SaasB2bSEOAgent", async () => {
    await assertOutput("saasb2b-seo", () => SaasB2bSEOAgent.instance.run(saasB2bInput));
  });

  it("SaasB2bSocialAgent", async () => {
    await assertOutput("saasb2b-social", () => SaasB2bSocialAgent.instance.run(saasB2bInput));
  });

  it("SaasB2bEmailAgent", async () => {
    await assertOutput("saasb2b-email", () => SaasB2bEmailAgent.instance.run(saasB2bInput));
  });

  it("SaasB2bReviewsAgent", async () => {
    await assertOutput("saasb2b-reviews", () => SaasB2bReviewsAgent.instance.run(saasB2bInput));
  });

  it("SaasB2bAnalyticsAgent", async () => {
    await assertOutput("saasb2b-analytics", () => SaasB2bAnalyticsAgent.instance.run(saasB2bInput));
  });
});
