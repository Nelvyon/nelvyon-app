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
  resetAllSeguridadCodigoAgentsForTests,
  SeguridadCodigoAnalyticsAgent,
  SeguridadCodigoAntiDebugAgent,
  SeguridadCodigoApiAgent,
  SeguridadCodigoAuditAgent,
  SeguridadCodigoBotsAgent,
  SeguridadCodigoHardeningAgent,
  SeguridadCodigoLicenciasAgent,
  SeguridadCodigoOfuscacionAgent,
} from "../sectors/seguridadcodigo";

const SC_JSON = JSON.stringify({
  result: "Seguridad código: ofuscación, APIs y hardening coordinados.",
  score: 92,
  recommendations: ["CSP estricto", "Rate limit por API key", "SBOM en CI"],
});

const seguridadCodigoInput = {
  userId: "00000000-0000-0000-0000-00000000sc01",
  businessName: "Empresa demo",
  services: ["API REST", "dashboard web"],
  targets: ["producción EU"],
};

describe("SeguridadCodigo agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SC_JSON);
    resetAllSeguridadCodigoAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("SeguridadCodigoOfuscacionAgent", async () => {
    await assertOutput("seguridadcodigo-ofuscacion", () => SeguridadCodigoOfuscacionAgent.instance().run(seguridadCodigoInput));
  });

  it("SeguridadCodigoAntiDebugAgent", async () => {
    await assertOutput("seguridadcodigo-antidebug", () => SeguridadCodigoAntiDebugAgent.instance().run(seguridadCodigoInput));
  });

  it("SeguridadCodigoLicenciasAgent", async () => {
    await assertOutput("seguridadcodigo-licencias", () => SeguridadCodigoLicenciasAgent.instance().run(seguridadCodigoInput));
  });

  it("SeguridadCodigoApiAgent", async () => {
    await assertOutput("seguridadcodigo-api", () => SeguridadCodigoApiAgent.instance().run(seguridadCodigoInput));
  });

  it("SeguridadCodigoBotsAgent", async () => {
    await assertOutput("seguridadcodigo-bots", () => SeguridadCodigoBotsAgent.instance().run(seguridadCodigoInput));
  });

  it("SeguridadCodigoAuditAgent", async () => {
    await assertOutput("seguridadcodigo-audit", () => SeguridadCodigoAuditAgent.instance().run(seguridadCodigoInput));
  });

  it("SeguridadCodigoHardeningAgent", async () => {
    await assertOutput("seguridadcodigo-hardening", () => SeguridadCodigoHardeningAgent.instance().run(seguridadCodigoInput));
  });

  it("SeguridadCodigoAnalyticsAgent", async () => {
    await assertOutput("seguridadcodigo-analytics", () => SeguridadCodigoAnalyticsAgent.instance().run(seguridadCodigoInput));
  });
});
