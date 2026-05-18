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
  resetAllVoiceV7AgentsForTests,
  VoiceV7AlmacenamientoAgent,
  VoiceV7AuditoriaAgent,
  VoiceV7ConsentimientoAgent,
  VoiceV7ExportacionAgent,
  VoiceV7GrabacionAgent,
  VoiceV7RedaccionAgent,
  VoiceV7RetencionAgent,
  VoiceV7TranscripcionAgent,
} from "../sectors/voicev7";

const V7_JSON = JSON.stringify({
  result: "Voice v7: consentimiento auditado, Whisper con redacción PII y retención por jurisdicción.",
  score: 92,
  recommendations: ["Script apertura 15s", "KMS CMK", "DSAR export firmado"],
});

const voiceV7Input = {
  userId: "00000000-0000-0000-0000-00000000v701",
  businessName: "Empresa demo",
  services: ["IVR grabado", "Whisper EU"],
  targets: ["GDPR", "HIPAA opcional"],
};

describe("VoiceV7 agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(V7_JSON);
    resetAllVoiceV7AgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceV7GrabacionAgent", async () => {
    await assertOutput("voicev7-grabacion", () => VoiceV7GrabacionAgent.instance().run(voiceV7Input));
  });

  it("VoiceV7TranscripcionAgent", async () => {
    await assertOutput("voicev7-transcripcion", () => VoiceV7TranscripcionAgent.instance().run(voiceV7Input));
  });

  it("VoiceV7AlmacenamientoAgent", async () => {
    await assertOutput("voicev7-almacenamiento", () => VoiceV7AlmacenamientoAgent.instance().run(voiceV7Input));
  });

  it("VoiceV7RetencionAgent", async () => {
    await assertOutput("voicev7-retencion", () => VoiceV7RetencionAgent.instance().run(voiceV7Input));
  });

  it("VoiceV7RedaccionAgent", async () => {
    await assertOutput("voicev7-redaccion", () => VoiceV7RedaccionAgent.instance().run(voiceV7Input));
  });

  it("VoiceV7AuditoriaAgent", async () => {
    await assertOutput("voicev7-auditoria", () => VoiceV7AuditoriaAgent.instance().run(voiceV7Input));
  });

  it("VoiceV7ExportacionAgent", async () => {
    await assertOutput("voicev7-exportacion", () => VoiceV7ExportacionAgent.instance().run(voiceV7Input));
  });

  it("VoiceV7ConsentimientoAgent", async () => {
    await assertOutput("voicev7-consentimiento", () => VoiceV7ConsentimientoAgent.instance().run(voiceV7Input));
  });
});
