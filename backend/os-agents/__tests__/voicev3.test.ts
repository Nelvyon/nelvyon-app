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
  resetAllVoiceV3AgentsForTests,
  VoiceV3AnalyticsAgent,
  VoiceV3CierreAgent,
  VoiceV3ContratoAgent,
  VoiceV3FirmaAgent,
  VoiceV3FollowUpAgent,
  VoiceV3ObjecionesAgent,
  VoiceV3PropuestaAgent,
  VoiceV3UpsellAgent,
} from "../sectors/voicev3";

const V3_JSON = JSON.stringify({
  result: "Voice v3: cierre asistido, contrato y firma con cadena de evidencias.",
  score: 90,
  recommendations: ["Revisión legal humana", "OTP firma", "Follow-up D+1"],
});

const voiceV3Input = {
  userId: "00000000-0000-0000-0000-00000000v301",
  businessName: "Empresa demo",
  services: ["plan Pro", "onboarding remoto"],
  targets: ["SMB", "ciclo 14 días"],
};

describe("VoiceV3 agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(V3_JSON);
    resetAllVoiceV3AgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceV3CierreAgent", async () => {
    await assertOutput("voicev3-cierre", () => VoiceV3CierreAgent.instance().run(voiceV3Input));
  });

  it("VoiceV3ObjecionesAgent", async () => {
    await assertOutput("voicev3-objeciones", () => VoiceV3ObjecionesAgent.instance().run(voiceV3Input));
  });

  it("VoiceV3PropuestaAgent", async () => {
    await assertOutput("voicev3-propuesta", () => VoiceV3PropuestaAgent.instance().run(voiceV3Input));
  });

  it("VoiceV3ContratoAgent", async () => {
    await assertOutput("voicev3-contrato", () => VoiceV3ContratoAgent.instance().run(voiceV3Input));
  });

  it("VoiceV3FirmaAgent", async () => {
    await assertOutput("voicev3-firma", () => VoiceV3FirmaAgent.instance().run(voiceV3Input));
  });

  it("VoiceV3FollowUpAgent", async () => {
    await assertOutput("voicev3-followup", () => VoiceV3FollowUpAgent.instance().run(voiceV3Input));
  });

  it("VoiceV3UpsellAgent", async () => {
    await assertOutput("voicev3-upsell", () => VoiceV3UpsellAgent.instance().run(voiceV3Input));
  });

  it("VoiceV3AnalyticsAgent", async () => {
    await assertOutput("voicev3-analytics", () => VoiceV3AnalyticsAgent.instance().run(voiceV3Input));
  });
});
