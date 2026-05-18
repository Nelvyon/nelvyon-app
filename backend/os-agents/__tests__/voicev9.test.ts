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
  resetAllVoiceV9AgentsForTests,
  VoiceV9ContinuidadAgent,
  VoiceV9DocumentosAgent,
  VoiceV9MetricasAgent,
  VoiceV9NotificacionesAgent,
  VoiceV9OptinAgent,
  VoiceV9SmsAgent,
  VoiceV9VideoAgent,
  VoiceV9WhatsAppAgent,
} from "../sectors/voicev9";

const V9_JSON = JSON.stringify({
  result: "Voice v9: salto voz→WA con contrato y SMS D+1, métricas agregadas sin PII.",
  score: 90,
  recommendations: ["Template WA aprobado", "STOP SMS", "HeyGen disclosure"],
});

const voiceV9Input = {
  userId: "00000000-0000-0000-0000-00000000v901",
  businessName: "Empresa demo",
  services: ["IVR", "WhatsApp"],
  targets: ["GDPR", "ES"],
};

describe("VoiceV9 agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(V9_JSON);
    resetAllVoiceV9AgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceV9WhatsAppAgent", async () => {
    await assertOutput("voicev9-whatsapp", () => VoiceV9WhatsAppAgent.instance().run(voiceV9Input));
  });

  it("VoiceV9SmsAgent", async () => {
    await assertOutput("voicev9-sms", () => VoiceV9SmsAgent.instance().run(voiceV9Input));
  });

  it("VoiceV9VideoAgent", async () => {
    await assertOutput("voicev9-video", () => VoiceV9VideoAgent.instance().run(voiceV9Input));
  });

  it("VoiceV9ContinuidadAgent", async () => {
    await assertOutput("voicev9-continuidad", () => VoiceV9ContinuidadAgent.instance().run(voiceV9Input));
  });

  it("VoiceV9DocumentosAgent", async () => {
    await assertOutput("voicev9-documentos", () => VoiceV9DocumentosAgent.instance().run(voiceV9Input));
  });

  it("VoiceV9NotificacionesAgent", async () => {
    await assertOutput("voicev9-notificaciones", () => VoiceV9NotificacionesAgent.instance().run(voiceV9Input));
  });

  it("VoiceV9OptinAgent", async () => {
    await assertOutput("voicev9-optin", () => VoiceV9OptinAgent.instance().run(voiceV9Input));
  });

  it("VoiceV9MetricasAgent", async () => {
    await assertOutput("voicev9-metricas", () => VoiceV9MetricasAgent.instance().run(voiceV9Input));
  });
});
