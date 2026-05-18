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
  ArteNftAnalyticsAgent,
  ArteNftComunidadAgent,
  ArteNftEmailAgent,
  ArteNftPortfolioAgent,
  ArteNftPreciosAgent,
  ArteNftReviewsAgent,
  ArteNftSEOAgent,
  ArteNftSocialAgent,
  resetAllArteNftAgentsForTests,
} from "../sectors/artenft";

const AN_JSON = JSON.stringify({
  result: "Arte NFT: portfolio, drops y métricas de conversión.",
  score: 93,
  recommendations: ["Allowlist", "Floor strategy", "Reel proceso"],
});

const artenftInput = {
  userId: "00000000-0000-0000-0000-00000000an01",
  businessName: "Colección demo",
  services: ["NFT", "prints"],
  targets: ["coleccionistas"],
};

describe("Arte NFT agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AN_JSON);
    resetAllArteNftAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("ArteNftPortfolioAgent", async () => {
    await assertOutput("artenft-portfolio", () => ArteNftPortfolioAgent.instance().run(artenftInput));
  });

  it("ArteNftComunidadAgent", async () => {
    await assertOutput("artenft-comunidad", () => ArteNftComunidadAgent.instance().run(artenftInput));
  });

  it("ArteNftPreciosAgent", async () => {
    await assertOutput("artenft-precios", () => ArteNftPreciosAgent.instance().run(artenftInput));
  });

  it("ArteNftSEOAgent", async () => {
    await assertOutput("artenft-seo", () => ArteNftSEOAgent.instance().run(artenftInput));
  });

  it("ArteNftSocialAgent", async () => {
    await assertOutput("artenft-social", () => ArteNftSocialAgent.instance().run(artenftInput));
  });

  it("ArteNftEmailAgent", async () => {
    await assertOutput("artenft-email", () => ArteNftEmailAgent.instance().run(artenftInput));
  });

  it("ArteNftReviewsAgent", async () => {
    await assertOutput("artenft-reviews", () => ArteNftReviewsAgent.instance().run(artenftInput));
  });

  it("ArteNftAnalyticsAgent", async () => {
    await assertOutput("artenft-analytics", () => ArteNftAnalyticsAgent.instance().run(artenftInput));
  });
});
