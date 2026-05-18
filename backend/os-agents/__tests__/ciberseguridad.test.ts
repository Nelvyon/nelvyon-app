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
  CiberseguridadAnalyticsAgent,
  CiberseguridadAuthorityAgent,
  CiberseguridadEmailAgent,
  CiberseguridadLeadGenAgent,
  CiberseguridadPreciosAgent,
  CiberseguridadReviewsAgent,
  CiberseguridadSEOAgent,
  CiberseguridadSocialAgent,
  resetAllCiberseguridadAgentsForTests,
} from "../sectors/ciberseguridad";

const CY_JSON = JSON.stringify({
  result: "Ciberseguridad: authority, lead gen enterprise, SEO técnico y analytics.",
  score: 93,
  recommendations: ["Thought leadership", "ABM CISO", "Pipeline enterprise"],
});

const ciberseguridadInput = {
  userId: "00000000-0000-0000-0000-00000000cy01",
  businessName: "Cyber demo",
  services: ["pentest", "SOC"],
  targets: ["CISO", "enterprise"],
};

describe("Ciberseguridad agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CY_JSON);
    resetAllCiberseguridadAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("CiberseguridadAuthorityAgent", async () => {
    await assertOutput("ciberseguridad-authority", () => CiberseguridadAuthorityAgent.instance.run(ciberseguridadInput));
  });

  it("CiberseguridadLeadGenAgent", async () => {
    await assertOutput("ciberseguridad-leadgen", () => CiberseguridadLeadGenAgent.instance.run(ciberseguridadInput));
  });

  it("CiberseguridadPreciosAgent", async () => {
    await assertOutput("ciberseguridad-precios", () => CiberseguridadPreciosAgent.instance.run(ciberseguridadInput));
  });

  it("CiberseguridadSEOAgent", async () => {
    await assertOutput("ciberseguridad-seo", () => CiberseguridadSEOAgent.instance.run(ciberseguridadInput));
  });

  it("CiberseguridadSocialAgent", async () => {
    await assertOutput("ciberseguridad-social", () => CiberseguridadSocialAgent.instance.run(ciberseguridadInput));
  });

  it("CiberseguridadEmailAgent", async () => {
    await assertOutput("ciberseguridad-email", () => CiberseguridadEmailAgent.instance.run(ciberseguridadInput));
  });

  it("CiberseguridadReviewsAgent", async () => {
    await assertOutput("ciberseguridad-reviews", () => CiberseguridadReviewsAgent.instance.run(ciberseguridadInput));
  });

  it("CiberseguridadAnalyticsAgent", async () => {
    await assertOutput("ciberseguridad-analytics", () => CiberseguridadAnalyticsAgent.instance.run(ciberseguridadInput));
  });
});
