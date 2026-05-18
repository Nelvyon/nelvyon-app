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
  resetAllVoiceV5AgentsForTests,
  VoiceV5ABTestingAgent,
  VoiceV5AnalyticsAgent,
  VoiceV5ClonadoAgent,
  VoiceV5ConsistenciaAgent,
  VoiceV5LocalizacionAgent,
  VoiceV5PersonalizacionAgent,
  VoiceV5TonoAgent,
} from "../sectors/voicev5";

const V5_JSON = JSON.stringify({
  result: "Voice v5: kit de marca con ElevenLabs, A/B y métricas de claridad.",
  score: 90,
  recommendations: ["Voice ID canónico", "Consentimiento clonado", "WER por locale"],
});

const voiceV5Input = {
  userId: "00000000-0000-0000-0000-00000000v501",
  businessName: "Empresa demo",
  services: ["IVR", "notificaciones habladas"],
  targets: ["ES-ES", "premium"],
};

describe("VoiceV5 agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(V5_JSON);
    resetAllVoiceV5AgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceV5PersonalizacionAgent", async () => {
    await assertOutput("voicev5-personalizacion", () => VoiceV5PersonalizacionAgent.instance().run(voiceV5Input));
  });

  it("VoiceV5ClonadoAgent", async () => {
    await assertOutput("voicev5-clonado", () => VoiceV5ClonadoAgent.instance().run(voiceV5Input));
  });

  it("VoiceV5TonoAgent", async () => {
    await assertOutput("voicev5-tono", () => VoiceV5TonoAgent.instance().run(voiceV5Input));
  });

  it("VoiceV5ConsistenciaAgent", async () => {
    await assertOutput("voicev5-consistencia", () => VoiceV5ConsistenciaAgent.instance().run(voiceV5Input));
  });

  it("VoiceV5ABTestingAgent", async () => {
    await assertOutput("voicev5-abtesting", () => VoiceV5ABTestingAgent.instance().run(voiceV5Input));
  });

  it("VoiceV5LocalizacionAgent", async () => {
    await assertOutput("voicev5-localizacion", () => VoiceV5LocalizacionAgent.instance().run(voiceV5Input));
  });

  it("VoiceV5AnalyticsAgent", async () => {
    await assertOutput("voicev5-analytics", () => VoiceV5AnalyticsAgent.instance().run(voiceV5Input));
  });
});
