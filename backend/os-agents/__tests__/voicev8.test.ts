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
  resetAllVoiceV8AgentsForTests,
  VoiceV8AlertasAgent,
  VoiceV8AnalisisAgent,
  VoiceV8BenchmarkAgent,
  VoiceV8CoachingAgent,
  VoiceV8HeatmapAgent,
  VoiceV8ObjecionesAgent,
  VoiceV8ReportesAgent,
  VoiceV8ScoringAgent,
} from "../sectors/voicev8";

const V8_JSON = JSON.stringify({
  result: "Voice v8: scoring explicable, coaching semanal y alertas SLO en tiempo real.",
  score: 91,
  recommendations: ["Rúbrica 5 dims", "Reporte lunes 9h", "Burn rate alertas"],
});

const voiceV8Input = {
  userId: "00000000-0000-0000-0000-00000000v801",
  businessName: "Empresa demo",
  services: ["IVR", "dashboard QA"],
  targets: ["B2B", "ES"],
};

describe("VoiceV8 agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(V8_JSON);
    resetAllVoiceV8AgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceV8AnalisisAgent", async () => {
    await assertOutput("voicev8-analisis", () => VoiceV8AnalisisAgent.instance().run(voiceV8Input));
  });

  it("VoiceV8ScoringAgent", async () => {
    await assertOutput("voicev8-scoring", () => VoiceV8ScoringAgent.instance().run(voiceV8Input));
  });

  it("VoiceV8ObjecionesAgent", async () => {
    await assertOutput("voicev8-objeciones", () => VoiceV8ObjecionesAgent.instance().run(voiceV8Input));
  });

  it("VoiceV8CoachingAgent", async () => {
    await assertOutput("voicev8-coaching", () => VoiceV8CoachingAgent.instance().run(voiceV8Input));
  });

  it("VoiceV8BenchmarkAgent", async () => {
    await assertOutput("voicev8-benchmark", () => VoiceV8BenchmarkAgent.instance().run(voiceV8Input));
  });

  it("VoiceV8ReportesAgent", async () => {
    await assertOutput("voicev8-reportes", () => VoiceV8ReportesAgent.instance().run(voiceV8Input));
  });

  it("VoiceV8AlertasAgent", async () => {
    await assertOutput("voicev8-alertas", () => VoiceV8AlertasAgent.instance().run(voiceV8Input));
  });

  it("VoiceV8HeatmapAgent", async () => {
    await assertOutput("voicev8-heatmap", () => VoiceV8HeatmapAgent.instance().run(voiceV8Input));
  });
});
