// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const dbMock = { query: queryMock };

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => dbMock,
  },
}));

const llmMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: llmMock }),
  },
}));

import {
  PricingDinamicoAbTestAgent,
  PricingDinamicoBundlesAgent,
  PricingDinamicoCompetenciaAgent,
  PricingDinamicoDescuentosAgent,
  PricingDinamicoElasticidadAgent,
  PricingDinamicoMargenAgent,
  PricingDinamicoOptimizadorAgent,
  PricingDinamicoPersonalizadoAgent,
  resetAllPricingDinamicoAgentsForTests,
} from "../sectors/pricingdinamico";

const PRICING_DINAMICO_JSON = JSON.stringify({
  result: "Pricing dinámico OS: elasticidad, bundles y alertas competencia con guardrails legales.",
  score: 88,
  recommendations: ["Floor margen", "Log cambios precio", "Revisión MAP/contrato"],
});

const pricingDinamicoInput = {
  userId: "00000000-0000-0000-0000-00000000pd01",
  businessName: "Negocio demo",
  services: ["Shopify", "RFM"],
  targets: ["EU", "MAP 10%"],
  metadata: { program: "pricingdinamico_v1" },
};

describe("PricingDinamico agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(PRICING_DINAMICO_JSON);
    resetAllPricingDinamicoAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("PricingDinamicoOptimizadorAgent", async () => {
    await assertOutput("pricingdinamico-optimizador", () => PricingDinamicoOptimizadorAgent.instance().run(pricingDinamicoInput));
  });
  it("PricingDinamicoElasticidadAgent", async () => {
    await assertOutput("pricingdinamico-elasticidad", () => PricingDinamicoElasticidadAgent.instance().run(pricingDinamicoInput));
  });
  it("PricingDinamicoPersonalizadoAgent", async () => {
    await assertOutput("pricingdinamico-personalizado", () => PricingDinamicoPersonalizadoAgent.instance().run(pricingDinamicoInput));
  });
  it("PricingDinamicoAbTestAgent", async () => {
    await assertOutput("pricingdinamico-abtest", () => PricingDinamicoAbTestAgent.instance().run(pricingDinamicoInput));
  });
  it("PricingDinamicoCompetenciaAgent", async () => {
    await assertOutput("pricingdinamico-competencia", () => PricingDinamicoCompetenciaAgent.instance().run(pricingDinamicoInput));
  });
  it("PricingDinamicoDescuentosAgent", async () => {
    await assertOutput("pricingdinamico-descuentos", () => PricingDinamicoDescuentosAgent.instance().run(pricingDinamicoInput));
  });
  it("PricingDinamicoBundlesAgent", async () => {
    await assertOutput("pricingdinamico-bundles", () => PricingDinamicoBundlesAgent.instance().run(pricingDinamicoInput));
  });
  it("PricingDinamicoMargenAgent", async () => {
    await assertOutput("pricingdinamico-margen", () => PricingDinamicoMargenAgent.instance().run(pricingDinamicoInput));
  });
});
