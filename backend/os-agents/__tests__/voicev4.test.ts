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
  resetAllVoiceV4AgentsForTests,
  VoiceV4AnalyticsAgent,
  VoiceV4ChatAgent,
  VoiceV4ContinuidadAgent,
  VoiceV4EmailAgent,
  VoiceV4EscalacionAgent,
  VoiceV4HandoffAgent,
  VoiceV4TransferenciaAgent,
  VoiceV4WhatsAppAgent,
} from "../sectors/voicev4";

const V4_JSON = JSON.stringify({
  result: "Voice v4: case_id unificado y handoff con resumen a chat y WhatsApp.",
  score: 91,
  recommendations: ["JWT handoff", "Plantilla WA aprobada", "Sankey abandono"],
});

const voiceV4Input = {
  userId: "00000000-0000-0000-0000-00000000v401",
  businessName: "Empresa demo",
  services: ["IVR", "widget chat", "WhatsApp"],
  targets: ["Europa", "24/7"],
};

describe("VoiceV4 agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(V4_JSON);
    resetAllVoiceV4AgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceV4TransferenciaAgent", async () => {
    await assertOutput("voicev4-transferencia", () => VoiceV4TransferenciaAgent.instance().run(voiceV4Input));
  });

  it("VoiceV4HandoffAgent", async () => {
    await assertOutput("voicev4-handoff", () => VoiceV4HandoffAgent.instance().run(voiceV4Input));
  });

  it("VoiceV4ContinuidadAgent", async () => {
    await assertOutput("voicev4-continuidad", () => VoiceV4ContinuidadAgent.instance().run(voiceV4Input));
  });

  it("VoiceV4WhatsAppAgent", async () => {
    await assertOutput("voicev4-whatsapp", () => VoiceV4WhatsAppAgent.instance().run(voiceV4Input));
  });

  it("VoiceV4EmailAgent", async () => {
    await assertOutput("voicev4-email", () => VoiceV4EmailAgent.instance().run(voiceV4Input));
  });

  it("VoiceV4ChatAgent", async () => {
    await assertOutput("voicev4-chat", () => VoiceV4ChatAgent.instance().run(voiceV4Input));
  });

  it("VoiceV4EscalacionAgent", async () => {
    await assertOutput("voicev4-escalacion", () => VoiceV4EscalacionAgent.instance().run(voiceV4Input));
  });

  it("VoiceV4AnalyticsAgent", async () => {
    await assertOutput("voicev4-analytics", () => VoiceV4AnalyticsAgent.instance().run(voiceV4Input));
  });
});
