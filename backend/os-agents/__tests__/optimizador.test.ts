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
  OptimizadorAbTestAgent,
  OptimizadorAnunciosAgent,
  OptimizadorAprendizajeAgent,
  OptimizadorCampanasAgent,
  OptimizadorCanalesAgent,
  OptimizadorCopyAgent,
  OptimizadorPresupuestoAgent,
  OptimizadorReportesAgent,
  resetAllOptimizadorAgentsForTests,
} from "../sectors/optimizador";

const OPTIMIZADOR_JSON = JSON.stringify({
  result: "Optimizador OS: campañas, presupuesto, canales y A/B con guardrails ROI.",
  score: 88,
  recommendations: ["Validar caps spend", "Cooldown pausas", "Log decisiones auto"],
});

const optimizadorInput = {
  userId: "00000000-0000-0000-0000-00000000op01",
  businessName: "Negocio demo",
  services: ["Meta Ads", "Google Ads"],
  targets: ["ROAS 2.5", "EU"],
  metadata: { program: "optimizador_v1" },
};

describe("Optimizador agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(OPTIMIZADOR_JSON);
    resetAllOptimizadorAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("OptimizadorCampanasAgent", async () => {
    await assertOutput("optimizador-campanas", () => OptimizadorCampanasAgent.instance().run(optimizadorInput));
  });
  it("OptimizadorPresupuestoAgent", async () => {
    await assertOutput("optimizador-presupuesto", () => OptimizadorPresupuestoAgent.instance().run(optimizadorInput));
  });
  it("OptimizadorAnunciosAgent", async () => {
    await assertOutput("optimizador-anuncios", () => OptimizadorAnunciosAgent.instance().run(optimizadorInput));
  });
  it("OptimizadorCopyAgent", async () => {
    await assertOutput("optimizador-copy", () => OptimizadorCopyAgent.instance().run(optimizadorInput));
  });
  it("OptimizadorCanalesAgent", async () => {
    await assertOutput("optimizador-canales", () => OptimizadorCanalesAgent.instance().run(optimizadorInput));
  });
  it("OptimizadorAbTestAgent", async () => {
    await assertOutput("optimizador-abtest", () => OptimizadorAbTestAgent.instance().run(optimizadorInput));
  });
  it("OptimizadorReportesAgent", async () => {
    await assertOutput("optimizador-reportes", () => OptimizadorReportesAgent.instance().run(optimizadorInput));
  });
  it("OptimizadorAprendizajeAgent", async () => {
    await assertOutput("optimizador-aprendizaje", () => OptimizadorAprendizajeAgent.instance().run(optimizadorInput));
  });
});
