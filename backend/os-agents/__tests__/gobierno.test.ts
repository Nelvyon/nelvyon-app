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
  GobiernoAnalyticsAgent,
  GobiernoComunicacionAgent,
  GobiernoContenidoAgent,
  GobiernoEmailAgent,
  GobiernoParticipacionAgent,
  GobiernoReviewsAgent,
  GobiernoSEOAgent,
  GobiernoSocialAgent,
  resetAllGobiernoAgentsForTests,
} from "../sectors/gobierno";

const GB_JSON = JSON.stringify({
  result: "Gobierno: transparencia, participación y sede electrónica.",
  score: 93,
  recommendations: ["Portal datos abiertos", "Consulta ciudadana", "KPI engagement"],
});

const gobiernoInput = {
  userId: "00000000-0000-0000-0000-00000000gb01",
  businessName: "Ayuntamiento demo",
  services: ["sede", "transparencia"],
  targets: ["vecinos"],
};

describe("Gobierno agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(GB_JSON);
    resetAllGobiernoAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("GobiernoComunicacionAgent", async () => {
    await assertOutput("gobierno-comunicacion", () => GobiernoComunicacionAgent.instance().run(gobiernoInput));
  });

  it("GobiernoParticipacionAgent", async () => {
    await assertOutput("gobierno-participacion", () => GobiernoParticipacionAgent.instance().run(gobiernoInput));
  });

  it("GobiernoContenidoAgent", async () => {
    await assertOutput("gobierno-contenido", () => GobiernoContenidoAgent.instance().run(gobiernoInput));
  });

  it("GobiernoSEOAgent", async () => {
    await assertOutput("gobierno-seo", () => GobiernoSEOAgent.instance().run(gobiernoInput));
  });

  it("GobiernoSocialAgent", async () => {
    await assertOutput("gobierno-social", () => GobiernoSocialAgent.instance().run(gobiernoInput));
  });

  it("GobiernoEmailAgent", async () => {
    await assertOutput("gobierno-email", () => GobiernoEmailAgent.instance().run(gobiernoInput));
  });

  it("GobiernoReviewsAgent", async () => {
    await assertOutput("gobierno-reviews", () => GobiernoReviewsAgent.instance().run(gobiernoInput));
  });

  it("GobiernoAnalyticsAgent", async () => {
    await assertOutput("gobierno-analytics", () => GobiernoAnalyticsAgent.instance().run(gobiernoInput));
  });
});
