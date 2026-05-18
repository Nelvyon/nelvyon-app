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
  DeporteAnalyticsAgent,
  DeporteEmailAgent,
  DeporteFansAgent,
  DeportePatrociniosAgent,
  DeportePreciosAgent,
  DeporteReviewsAgent,
  DeporteSEOAgent,
  DeporteSocialAgent,
  resetAllDeporteAgentsForTests,
} from "../sectors/deporte";

const DP_JSON = JSON.stringify({
  result: "Deporte: fans, patrocinio y revenue ticketing.",
  score: 93,
  recommendations: ["Abono digital", "Dossier sponsor", "ARPU fan"],
});

const deporteInput = {
  userId: "00000000-0000-0000-0000-00000000dp01",
  businessName: "Club demo",
  services: ["abonos", "streaming"],
  targets: ["socios", "sponsors"],
};

describe("Deporte agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(DP_JSON);
    resetAllDeporteAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("DeporteFansAgent", async () => {
    await assertOutput("deporte-fans", () => DeporteFansAgent.instance().run(deporteInput));
  });

  it("DeportePatrociniosAgent", async () => {
    await assertOutput("deporte-patrocinios", () => DeportePatrociniosAgent.instance().run(deporteInput));
  });

  it("DeportePreciosAgent", async () => {
    await assertOutput("deporte-precios", () => DeportePreciosAgent.instance().run(deporteInput));
  });

  it("DeporteSEOAgent", async () => {
    await assertOutput("deporte-seo", () => DeporteSEOAgent.instance().run(deporteInput));
  });

  it("DeporteSocialAgent", async () => {
    await assertOutput("deporte-social", () => DeporteSocialAgent.instance().run(deporteInput));
  });

  it("DeporteEmailAgent", async () => {
    await assertOutput("deporte-email", () => DeporteEmailAgent.instance().run(deporteInput));
  });

  it("DeporteReviewsAgent", async () => {
    await assertOutput("deporte-reviews", () => DeporteReviewsAgent.instance().run(deporteInput));
  });

  it("DeporteAnalyticsAgent", async () => {
    await assertOutput("deporte-analytics", () => DeporteAnalyticsAgent.instance().run(deporteInput));
  });
});
