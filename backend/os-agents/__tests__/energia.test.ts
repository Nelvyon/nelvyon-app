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
  EnergiaAdquisicionAgent,
  EnergiaAnalyticsAgent,
  EnergiaEmailAgent,
  EnergiaPreciosAgent,
  EnergiaRetencionAgent,
  EnergiaReviewsAgent,
  EnergiaSEOAgent,
  EnergiaSocialAgent,
  resetAllEnergiaAgentsForTests,
} from "../sectors/energia";

const EN_JSON = JSON.stringify({
  result: "Energía: comercialización, solar, utilities y eficiencia.",
  score: 93,
  recommendations: ["Tarifa indexada", "Upsell placas", "Cohort LTV"],
});

const energiaInput = {
  userId: "00000000-0000-0000-0000-00000000en01",
  businessName: "Energía demo",
  services: ["luz", "gas", "solar"],
  targets: ["hogares", "PYME"],
};

describe("Energía agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(EN_JSON);
    resetAllEnergiaAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("EnergiaAdquisicionAgent", async () => {
    await assertOutput("energia-adquisicion", () => EnergiaAdquisicionAgent.instance().run(energiaInput));
  });

  it("EnergiaRetencionAgent", async () => {
    await assertOutput("energia-retencion", () => EnergiaRetencionAgent.instance().run(energiaInput));
  });

  it("EnergiaPreciosAgent", async () => {
    await assertOutput("energia-precios", () => EnergiaPreciosAgent.instance().run(energiaInput));
  });

  it("EnergiaSEOAgent", async () => {
    await assertOutput("energia-seo", () => EnergiaSEOAgent.instance().run(energiaInput));
  });

  it("EnergiaSocialAgent", async () => {
    await assertOutput("energia-social", () => EnergiaSocialAgent.instance().run(energiaInput));
  });

  it("EnergiaEmailAgent", async () => {
    await assertOutput("energia-email", () => EnergiaEmailAgent.instance().run(energiaInput));
  });

  it("EnergiaReviewsAgent", async () => {
    await assertOutput("energia-reviews", () => EnergiaReviewsAgent.instance().run(energiaInput));
  });

  it("EnergiaAnalyticsAgent", async () => {
    await assertOutput("energia-analytics", () => EnergiaAnalyticsAgent.instance().run(energiaInput));
  });
});
