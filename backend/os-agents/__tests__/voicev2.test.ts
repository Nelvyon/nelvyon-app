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
    getInstance: () => ({ complete: completeMock }),
  },
}));

import {
  resetAllVoiceV2AgentsForTests,
  VoiceV2AnalyticsAgent,
  VoiceV2ContextoAgent,
  VoiceV2IntegracionAgent,
  VoiceV2MemoriaAgent,
  VoiceV2PerfilClienteAgent,
  VoiceV2PersonalizacionAgent,
  VoiceV2ResumenAgent,
  VoiceV2SeguimientoAgent,
} from "../sectors/voicev2";

const V2_JSON = JSON.stringify({
  result: "Voice v2: memoria persistente, contexto mid-call y handoff estructurado.",
  score: 91,
  recommendations: ["Ventana RAG 4k tokens", "Resumen post-call a CRM", "Opt-in memoria"],
});

const voiceV2Input = {
  userId: "00000000-0000-0000-0000-00000000v201",
  businessName: "Empresa demo",
  services: ["IVR", "agente conversacional"],
  targets: ["ES-ES", "horario 24/7"],
};

describe("VoiceV2 agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(V2_JSON);
    resetAllVoiceV2AgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceV2MemoriaAgent", async () => {
    await assertOutput("voicev2-memoria", () => VoiceV2MemoriaAgent.instance().run(voiceV2Input));
  });

  it("VoiceV2ContextoAgent", async () => {
    await assertOutput("voicev2-contexto", () => VoiceV2ContextoAgent.instance().run(voiceV2Input));
  });

  it("VoiceV2PerfilClienteAgent", async () => {
    await assertOutput("voicev2-perfilcliente", () => VoiceV2PerfilClienteAgent.instance().run(voiceV2Input));
  });

  it("VoiceV2PersonalizacionAgent", async () => {
    await assertOutput("voicev2-personalizacion", () => VoiceV2PersonalizacionAgent.instance().run(voiceV2Input));
  });

  it("VoiceV2ResumenAgent", async () => {
    await assertOutput("voicev2-resumen", () => VoiceV2ResumenAgent.instance().run(voiceV2Input));
  });

  it("VoiceV2SeguimientoAgent", async () => {
    await assertOutput("voicev2-seguimiento", () => VoiceV2SeguimientoAgent.instance().run(voiceV2Input));
  });

  it("VoiceV2IntegracionAgent", async () => {
    await assertOutput("voicev2-integracion", () => VoiceV2IntegracionAgent.instance().run(voiceV2Input));
  });

  it("VoiceV2AnalyticsAgent", async () => {
    await assertOutput("voicev2-analytics", () => VoiceV2AnalyticsAgent.instance().run(voiceV2Input));
  });
});
