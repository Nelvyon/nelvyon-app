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
  resetAllVoiceV6AgentsForTests,
  VoiceV6BalanceoAgent,
  VoiceV6ColasAgent,
  VoiceV6CostesAgent,
  VoiceV6FailoverAgent,
  VoiceV6MonitoreoAgent,
  VoiceV6OrquestadorAgent,
  VoiceV6RateLimitAgent,
  VoiceV6ScalingAgent,
} from "../sectors/voicev6";

const V6_JSON = JSON.stringify({
  result: "Voice v6: orquestación regional, failover carrier y coste por minuto trazable.",
  score: 91,
  recommendations: ["Circuit breaker TTS", "WFQ por plan", "Forecast CPS +10%"],
});

const voiceV6Input = {
  userId: "00000000-0000-0000-0000-00000000v601",
  businessName: "Empresa demo",
  services: ["SBC", "Kubernetes"],
  targets: ["multi-región", "SLA 99.99"],
};

describe("VoiceV6 agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(V6_JSON);
    resetAllVoiceV6AgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("VoiceV6OrquestadorAgent", async () => {
    await assertOutput("voicev6-orquestador", () => VoiceV6OrquestadorAgent.instance().run(voiceV6Input));
  });

  it("VoiceV6BalanceoAgent", async () => {
    await assertOutput("voicev6-balanceo", () => VoiceV6BalanceoAgent.instance().run(voiceV6Input));
  });

  it("VoiceV6ColasAgent", async () => {
    await assertOutput("voicev6-colas", () => VoiceV6ColasAgent.instance().run(voiceV6Input));
  });

  it("VoiceV6FailoverAgent", async () => {
    await assertOutput("voicev6-failover", () => VoiceV6FailoverAgent.instance().run(voiceV6Input));
  });

  it("VoiceV6RateLimitAgent", async () => {
    await assertOutput("voicev6-ratelimit", () => VoiceV6RateLimitAgent.instance().run(voiceV6Input));
  });

  it("VoiceV6MonitoreoAgent", async () => {
    await assertOutput("voicev6-monitoreo", () => VoiceV6MonitoreoAgent.instance().run(voiceV6Input));
  });

  it("VoiceV6ScalingAgent", async () => {
    await assertOutput("voicev6-scaling", () => VoiceV6ScalingAgent.instance().run(voiceV6Input));
  });

  it("VoiceV6CostesAgent", async () => {
    await assertOutput("voicev6-costes", () => VoiceV6CostesAgent.instance().run(voiceV6Input));
  });
});
