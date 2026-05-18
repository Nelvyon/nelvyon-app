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
  ConsultoriaAnalyticsAgent,
  ConsultoriaAutorityAgent,
  ConsultoriaEmailAgent,
  ConsultoriaLeadGenAgent,
  ConsultoriaPreciosAgent,
  ConsultoriaReviewsAgent,
  ConsultoriaSEOAgent,
  ConsultoriaSocialAgent,
  resetAllConsultoriaAgentsForTests,
} from "../sectors/consultoria";

const CO_JSON = JSON.stringify({
  result: "Consultoría: autoridad, leads B2B, propuestas y analytics de pipeline.",
  score: 93,
  recommendations: ["Thought leadership", "LinkedIn ABM", "Tasa de cierre"],
});

const consultoriaInput = {
  userId: "00000000-0000-0000-0000-00000000co01",
  businessName: "Consultora demo",
  services: ["estrategia", "management"],
  targets: ["mid-market", "enterprise"],
};

describe("Consultoria agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CO_JSON);
    resetAllConsultoriaAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("ConsultoriaAutorityAgent", async () => {
    await assertOutput("consultoria-autority", () => ConsultoriaAutorityAgent.instance.run(consultoriaInput));
  });

  it("ConsultoriaLeadGenAgent", async () => {
    await assertOutput("consultoria-leadgen", () => ConsultoriaLeadGenAgent.instance.run(consultoriaInput));
  });

  it("ConsultoriaPreciosAgent", async () => {
    await assertOutput("consultoria-precios", () => ConsultoriaPreciosAgent.instance.run(consultoriaInput));
  });

  it("ConsultoriaSEOAgent", async () => {
    await assertOutput("consultoria-seo", () => ConsultoriaSEOAgent.instance.run(consultoriaInput));
  });

  it("ConsultoriaSocialAgent", async () => {
    await assertOutput("consultoria-social", () => ConsultoriaSocialAgent.instance.run(consultoriaInput));
  });

  it("ConsultoriaEmailAgent", async () => {
    await assertOutput("consultoria-email", () => ConsultoriaEmailAgent.instance.run(consultoriaInput));
  });

  it("ConsultoriaReviewsAgent", async () => {
    await assertOutput("consultoria-reviews", () => ConsultoriaReviewsAgent.instance.run(consultoriaInput));
  });

  it("ConsultoriaAnalyticsAgent", async () => {
    await assertOutput("consultoria-analytics", () => ConsultoriaAnalyticsAgent.instance.run(consultoriaInput));
  });
});
