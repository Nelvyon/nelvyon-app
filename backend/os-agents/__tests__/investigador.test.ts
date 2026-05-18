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
  InvestigadorAudienciaAgent,
  InvestigadorCompetidoresAgent,
  InvestigadorKeywordsAgent,
  InvestigadorOportunidadesAgent,
  InvestigadorPreciosAgent,
  InvestigadorReportesAgent,
  InvestigadorSectorialAgent,
  InvestigadorTendenciasAgent,
  resetAllInvestigadorAgentsForTests,
} from "../sectors/investigador";

const INVESTIGADOR_JSON = JSON.stringify({
  result: "Investigador OS: competencia, keywords y precios con fuentes y confianza.",
  score: 88,
  recommendations: ["Triangular fuentes", "Fecha corte explícita", "Legal review claims"],
});

const investigadorInput = {
  userId: "00000000-0000-0000-0000-00000000iv01",
  businessName: "Negocio demo",
  services: ["SimilarWeb", "G2"],
  targets: ["EU", "mid-market"],
  metadata: { program: "investigador_v1" },
};

describe("Investigador agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(INVESTIGADOR_JSON);
    resetAllInvestigadorAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("InvestigadorCompetidoresAgent", async () => {
    await assertOutput("investigador-competidores", () => InvestigadorCompetidoresAgent.instance().run(investigadorInput));
  });
  it("InvestigadorTendenciasAgent", async () => {
    await assertOutput("investigador-tendencias", () => InvestigadorTendenciasAgent.instance().run(investigadorInput));
  });
  it("InvestigadorAudienciaAgent", async () => {
    await assertOutput("investigador-audiencia", () => InvestigadorAudienciaAgent.instance().run(investigadorInput));
  });
  it("InvestigadorOportunidadesAgent", async () => {
    await assertOutput("investigador-oportunidades", () => InvestigadorOportunidadesAgent.instance().run(investigadorInput));
  });
  it("InvestigadorKeywordsAgent", async () => {
    await assertOutput("investigador-keywords", () => InvestigadorKeywordsAgent.instance().run(investigadorInput));
  });
  it("InvestigadorPreciosAgent", async () => {
    await assertOutput("investigador-precios", () => InvestigadorPreciosAgent.instance().run(investigadorInput));
  });
  it("InvestigadorReportesAgent", async () => {
    await assertOutput("investigador-reportes", () => InvestigadorReportesAgent.instance().run(investigadorInput));
  });
  it("InvestigadorSectorialAgent", async () => {
    await assertOutput("investigador-sectorial", () => InvestigadorSectorialAgent.instance().run(investigadorInput));
  });
});
