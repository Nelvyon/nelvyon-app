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
  ProteccionIpAnalyticsAgent,
  ProteccionIpCopyrightAgent,
  ProteccionIpLitigacionAgent,
  ProteccionIpMarcasAgent,
  ProteccionIpMonitoreoAgent,
  ProteccionIpOfuscacionAgent,
  ProteccionIpPatentesAgent,
  ProteccionIpSecretsAgent,
  resetAllProteccionIpAgentsForTests,
} from "../sectors/proteccionip";

const PI_JSON = JSON.stringify({
  result: "Protección IP: marcas, secretos y mapa de riesgos de cartera.",
  score: 93,
  recommendations: ["Watch service", "NDA plantilla", "Tablero vencimientos"],
});

const proteccionIpInput = {
  userId: "00000000-0000-0000-0000-00000000pi01",
  businessName: "Empresa demo",
  services: ["marca", "código"],
  targets: ["global"],
};

describe("ProteccionIp agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PI_JSON);
    resetAllProteccionIpAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("ProteccionIpMarcasAgent", async () => {
    await assertOutput("proteccionip-marcas", () => ProteccionIpMarcasAgent.instance().run(proteccionIpInput));
  });

  it("ProteccionIpPatentesAgent", async () => {
    await assertOutput("proteccionip-patentes", () => ProteccionIpPatentesAgent.instance().run(proteccionIpInput));
  });

  it("ProteccionIpCopyrightAgent", async () => {
    await assertOutput("proteccionip-copyright", () => ProteccionIpCopyrightAgent.instance().run(proteccionIpInput));
  });

  it("ProteccionIpOfuscacionAgent", async () => {
    await assertOutput("proteccionip-ofuscacion", () => ProteccionIpOfuscacionAgent.instance().run(proteccionIpInput));
  });

  it("ProteccionIpSecretsAgent", async () => {
    await assertOutput("proteccionip-secrets", () => ProteccionIpSecretsAgent.instance().run(proteccionIpInput));
  });

  it("ProteccionIpMonitoreoAgent", async () => {
    await assertOutput("proteccionip-monitoreo", () => ProteccionIpMonitoreoAgent.instance().run(proteccionIpInput));
  });

  it("ProteccionIpLitigacionAgent", async () => {
    await assertOutput("proteccionip-litigacion", () => ProteccionIpLitigacionAgent.instance().run(proteccionIpInput));
  });

  it("ProteccionIpAnalyticsAgent", async () => {
    await assertOutput("proteccionip-analytics", () => ProteccionIpAnalyticsAgent.instance().run(proteccionIpInput));
  });
});
