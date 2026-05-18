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
  SegurosAnalyticsAgent,
  SegurosEmailAgent,
  SegurosLeadGenAgent,
  SegurosPreciosAgent,
  SegurosRetencionAgent,
  SegurosReviewsAgent,
  SegurosSEOAgent,
  SegurosSocialAgent,
  resetAllSegurosAgentsForTests,
} from "../sectors/seguros";

const SG_JSON = JSON.stringify({
  result: "Seguros: correduría, comparadores y ramos vida/salud/auto.",
  score: 93,
  recommendations: ["Lead scoring ramo", "Renovación T-60", "LTV canal"],
});

const segurosInput = {
  userId: "00000000-0000-0000-0000-00000000sg01",
  businessName: "Seguros demo",
  services: ["auto", "hogar"],
  targets: ["particulares"],
};

describe("Seguros agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SG_JSON);
    resetAllSegurosAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("SegurosLeadGenAgent", async () => {
    await assertOutput("seguros-lead-gen", () => SegurosLeadGenAgent.instance().run(segurosInput));
  });

  it("SegurosRetencionAgent", async () => {
    await assertOutput("seguros-retencion", () => SegurosRetencionAgent.instance().run(segurosInput));
  });

  it("SegurosPreciosAgent", async () => {
    await assertOutput("seguros-precios", () => SegurosPreciosAgent.instance().run(segurosInput));
  });

  it("SegurosSEOAgent", async () => {
    await assertOutput("seguros-seo", () => SegurosSEOAgent.instance().run(segurosInput));
  });

  it("SegurosSocialAgent", async () => {
    await assertOutput("seguros-social", () => SegurosSocialAgent.instance().run(segurosInput));
  });

  it("SegurosEmailAgent", async () => {
    await assertOutput("seguros-email", () => SegurosEmailAgent.instance().run(segurosInput));
  });

  it("SegurosReviewsAgent", async () => {
    await assertOutput("seguros-reviews", () => SegurosReviewsAgent.instance().run(segurosInput));
  });

  it("SegurosAnalyticsAgent", async () => {
    await assertOutput("seguros-analytics", () => SegurosAnalyticsAgent.instance().run(segurosInput));
  });
});
