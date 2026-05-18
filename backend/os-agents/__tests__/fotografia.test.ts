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
  FotografiaAnalyticsAgent,
  FotografiaClientesAgent,
  FotografiaEmailAgent,
  FotografiaPortfolioAgent,
  FotografiaPreciosAgent,
  FotografiaReviewsAgent,
  FotografiaSEOAgent,
  FotografiaSocialAgent,
  resetAllFotografiaAgentsForTests,
} from "../sectors/fotografia";

const FT_JSON = JSON.stringify({
  result: "Fotografía: portfolio visual, paquetes y conversión por canal.",
  score: 93,
  recommendations: ["Galería proofing", "Paquete boda 3 niveles", "UTM Instagram"],
});

const fotografiaInput = {
  userId: "00000000-0000-0000-0000-00000000ft01",
  businessName: "Estudio demo",
  services: ["bodas", "producto"],
  targets: ["novias"],
};

describe("Fotografia agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(FT_JSON);
    resetAllFotografiaAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("FotografiaPortfolioAgent", async () => {
    await assertOutput("fotografia-portfolio", () => FotografiaPortfolioAgent.instance().run(fotografiaInput));
  });

  it("FotografiaClientesAgent", async () => {
    await assertOutput("fotografia-clientes", () => FotografiaClientesAgent.instance().run(fotografiaInput));
  });

  it("FotografiaPreciosAgent", async () => {
    await assertOutput("fotografia-precios", () => FotografiaPreciosAgent.instance().run(fotografiaInput));
  });

  it("FotografiaSEOAgent", async () => {
    await assertOutput("fotografia-seo", () => FotografiaSEOAgent.instance().run(fotografiaInput));
  });

  it("FotografiaSocialAgent", async () => {
    await assertOutput("fotografia-social", () => FotografiaSocialAgent.instance().run(fotografiaInput));
  });

  it("FotografiaEmailAgent", async () => {
    await assertOutput("fotografia-email", () => FotografiaEmailAgent.instance().run(fotografiaInput));
  });

  it("FotografiaReviewsAgent", async () => {
    await assertOutput("fotografia-reviews", () => FotografiaReviewsAgent.instance().run(fotografiaInput));
  });

  it("FotografiaAnalyticsAgent", async () => {
    await assertOutput("fotografia-analytics", () => FotografiaAnalyticsAgent.instance().run(fotografiaInput));
  });
});
