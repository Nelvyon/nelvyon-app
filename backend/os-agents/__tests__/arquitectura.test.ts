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
  ArquitecturaAnalyticsAgent,
  ArquitecturaClientesAgent,
  ArquitecturaEmailAgent,
  ArquitecturaPortfolioAgent,
  ArquitecturaPreciosAgent,
  ArquitecturaReviewsAgent,
  ArquitecturaSEOAgent,
  ArquitecturaSocialAgent,
  resetAllArquitecturaAgentsForTests,
} from "../sectors/arquitectura";

const AQ_JSON = JSON.stringify({
  result: "Arquitectura: portfolio, leads locales y ticket medio.",
  score: 93,
  recommendations: ["Reel antes/después", "Google Business", "Fee por fase"],
});

const arquitecturaInput = {
  userId: "00000000-0000-0000-0000-00000000aq01",
  businessName: "Estudio demo",
  services: ["reformas", "interiorismo"],
  targets: ["particulares"],
};

describe("Arquitectura agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AQ_JSON);
    resetAllArquitecturaAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("ArquitecturaPortfolioAgent", async () => {
    await assertOutput("arquitectura-portfolio", () => ArquitecturaPortfolioAgent.instance().run(arquitecturaInput));
  });

  it("ArquitecturaClientesAgent", async () => {
    await assertOutput("arquitectura-clientes", () => ArquitecturaClientesAgent.instance().run(arquitecturaInput));
  });

  it("ArquitecturaPreciosAgent", async () => {
    await assertOutput("arquitectura-precios", () => ArquitecturaPreciosAgent.instance().run(arquitecturaInput));
  });

  it("ArquitecturaSEOAgent", async () => {
    await assertOutput("arquitectura-seo", () => ArquitecturaSEOAgent.instance().run(arquitecturaInput));
  });

  it("ArquitecturaSocialAgent", async () => {
    await assertOutput("arquitectura-social", () => ArquitecturaSocialAgent.instance().run(arquitecturaInput));
  });

  it("ArquitecturaEmailAgent", async () => {
    await assertOutput("arquitectura-email", () => ArquitecturaEmailAgent.instance().run(arquitecturaInput));
  });

  it("ArquitecturaReviewsAgent", async () => {
    await assertOutput("arquitectura-reviews", () => ArquitecturaReviewsAgent.instance().run(arquitecturaInput));
  });

  it("ArquitecturaAnalyticsAgent", async () => {
    await assertOutput("arquitectura-analytics", () => ArquitecturaAnalyticsAgent.instance().run(arquitecturaInput));
  });
});
