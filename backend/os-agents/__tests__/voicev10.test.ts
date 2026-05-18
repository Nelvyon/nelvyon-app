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
  resetAllVoiceV10AgentsForTests,
  VoiceV10AjusteTonalAgent,
  VoiceV10AlertasAgent,
  VoiceV10CorrelacionAgent,
  VoiceV10DeteccionAgent,
  VoiceV10EscalacionAgent,
  VoiceV10RegistroAgent,
  VoiceV10SentimientoAgent,
} from "../sectors/voicev10";

const V10_JSON = JSON.stringify({
  result: "Voice v10: frustración con histeresis, TTS empático y correlación agregada a conversión.",
  score: 90,
  recommendations: ["EMA emoción", "Umbral 2 de 3", "k-anon en agregados"],
});

const voiceV10Input = {
  userId: "00000000-0000-0000-0000-00000000va01",
  businessName: "Empresa demo",
  services: ["IVR", "dashboard supervisor"],
  targets: ["B2C", "ES"],
};

describe("VoiceV10 agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(V10_JSON);
    resetAllVoiceV10AgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceV10DeteccionAgent", async () => {
    await assertOutput("voicev10-deteccion", () => VoiceV10DeteccionAgent.instance().run(voiceV10Input));
  });

  it("VoiceV10AjusteTonalAgent", async () => {
    await assertOutput("voicev10-ajustetonal", () => VoiceV10AjusteTonalAgent.instance().run(voiceV10Input));
  });

  it("VoiceV10EscalacionAgent", async () => {
    await assertOutput("voicev10-escalacion", () => VoiceV10EscalacionAgent.instance().run(voiceV10Input));
  });

  it("VoiceV10RegistroAgent", async () => {
    await assertOutput("voicev10-registro", () => VoiceV10RegistroAgent.instance().run(voiceV10Input));
  });

  it("VoiceV10AlertasAgent", async () => {
    await assertOutput("voicev10-alertas", () => VoiceV10AlertasAgent.instance().run(voiceV10Input));
  });

  it("VoiceV10SentimientoAgent", async () => {
    await assertOutput("voicev10-sentimiento", () => VoiceV10SentimientoAgent.instance().run(voiceV10Input));
  });

  it("VoiceV10CorrelacionAgent", async () => {
    await assertOutput("voicev10-correlacion", () => VoiceV10CorrelacionAgent.instance().run(voiceV10Input));
  });
});
