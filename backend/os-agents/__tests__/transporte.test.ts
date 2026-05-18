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
  TransporteAnalyticsAgent,
  TransporteClientesAgent,
  TransporteEmailAgent,
  TransporteFlotaAgent,
  TransportePreciosAgent,
  TransporteReviewsAgent,
  TransporteSEOAgent,
  TransporteSocialAgent,
  resetAllTransporteAgentsForTests,
} from "../sectors/transporte";

const TR_JSON = JSON.stringify({
  result: "Transporte: flota, última milla y NPS entregas.",
  score: 93,
  recommendations: ["OTIF", "Rutas cluster", "Email tracking"],
});

const transporteInput = {
  userId: "00000000-0000-0000-0000-00000000tr01",
  businessName: "Transporte demo",
  services: ["paquetería", "flota"],
  targets: ["B2B urbano"],
};

describe("Transporte agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(TR_JSON);
    resetAllTransporteAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("TransporteClientesAgent", async () => {
    await assertOutput("transporte-clientes", () => TransporteClientesAgent.instance().run(transporteInput));
  });

  it("TransporteFlotaAgent", async () => {
    await assertOutput("transporte-flota", () => TransporteFlotaAgent.instance().run(transporteInput));
  });

  it("TransportePreciosAgent", async () => {
    await assertOutput("transporte-precios", () => TransportePreciosAgent.instance().run(transporteInput));
  });

  it("TransporteSEOAgent", async () => {
    await assertOutput("transporte-seo", () => TransporteSEOAgent.instance().run(transporteInput));
  });

  it("TransporteSocialAgent", async () => {
    await assertOutput("transporte-social", () => TransporteSocialAgent.instance().run(transporteInput));
  });

  it("TransporteEmailAgent", async () => {
    await assertOutput("transporte-email", () => TransporteEmailAgent.instance().run(transporteInput));
  });

  it("TransporteReviewsAgent", async () => {
    await assertOutput("transporte-reviews", () => TransporteReviewsAgent.instance().run(transporteInput));
  });

  it("TransporteAnalyticsAgent", async () => {
    await assertOutput("transporte-analytics", () => TransporteAnalyticsAgent.instance().run(transporteInput));
  });
});
