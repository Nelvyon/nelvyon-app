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
  MarcaArquitecturaAgent,
  MarcaConsistenciaAgent,
  MarcaEvolucionAgent,
  MarcaIdentidadAgent,
  MarcaNamingAgent,
  MarcaPerceptionAgent,
  MarcaPosicionamientoAgent,
  MarcaTonoComunicacionAgent,
  resetAllMarcaAgentsForTests,
} from "../sectors/marca";

const MR_JSON = JSON.stringify({
  result: "Marca global: identidad, posicionamiento y arquitectura coherente.",
  score: 93,
  recommendations: ["Brand book", "Claim test", "Submarca B2B"],
});

const marcaInput = {
  userId: "00000000-0000-0000-0000-00000000mr01",
  businessName: "Marca demo",
  industry: "SaaS",
  targets: ["B2B"],
};

describe("Marca agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(MR_JSON);
    resetAllMarcaAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("MarcaIdentidadAgent", async () => {
    await assertOutput("marca-identidad", () => MarcaIdentidadAgent.instance().run(marcaInput));
  });

  it("MarcaPosicionamientoAgent", async () => {
    await assertOutput("marca-posicionamiento", () => MarcaPosicionamientoAgent.instance().run(marcaInput));
  });

  it("MarcaTonoComunicacionAgent", async () => {
    await assertOutput("marca-tono-comunicacion", () => MarcaTonoComunicacionAgent.instance().run(marcaInput));
  });

  it("MarcaNamingAgent", async () => {
    await assertOutput("marca-naming", () => MarcaNamingAgent.instance().run(marcaInput));
  });

  it("MarcaArquitecturaAgent", async () => {
    await assertOutput("marca-arquitectura", () => MarcaArquitecturaAgent.instance().run(marcaInput));
  });

  it("MarcaConsistenciaAgent", async () => {
    await assertOutput("marca-consistencia", () => MarcaConsistenciaAgent.instance().run(marcaInput));
  });

  it("MarcaPerceptionAgent", async () => {
    await assertOutput("marca-perception", () => MarcaPerceptionAgent.instance().run(marcaInput));
  });

  it("MarcaEvolucionAgent", async () => {
    await assertOutput("marca-evolucion", () => MarcaEvolucionAgent.instance().run(marcaInput));
  });
});
