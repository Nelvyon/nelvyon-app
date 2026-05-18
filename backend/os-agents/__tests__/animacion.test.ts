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
  AnimacionAnalyticsAgent,
  AnimacionClientesAgent,
  AnimacionEmailAgent,
  AnimacionPortfolioAgent,
  AnimacionPreciosAgent,
  AnimacionReviewsAgent,
  AnimacionSEOAgent,
  AnimacionSocialAgent,
  resetAllAnimacionAgentsForTests,
} from "../sectors/animacion";

const AN_JSON = JSON.stringify({
  result: "3D/animación/VFX: portfolio, clientes, pricing y analytics de pipeline.",
  score: 93,
  recommendations: ["Showreel interactivo", "Behance + YouTube", "Pipeline conversión"],
});

const animacionInput = {
  userId: "00000000-0000-0000-0000-00000000an01",
  businessName: "Estudio 3D demo",
  services: ["3D", "VFX"],
  targets: ["agencias", "marcas"],
};

describe("Animacion agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AN_JSON);
    resetAllAnimacionAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("AnimacionPortfolioAgent", async () => {
    await assertOutput("animacion-portfolio", () => AnimacionPortfolioAgent.instance.run(animacionInput));
  });

  it("AnimacionClientesAgent", async () => {
    await assertOutput("animacion-clientes", () => AnimacionClientesAgent.instance.run(animacionInput));
  });

  it("AnimacionPreciosAgent", async () => {
    await assertOutput("animacion-precios", () => AnimacionPreciosAgent.instance.run(animacionInput));
  });

  it("AnimacionSEOAgent", async () => {
    await assertOutput("animacion-seo", () => AnimacionSEOAgent.instance.run(animacionInput));
  });

  it("AnimacionSocialAgent", async () => {
    await assertOutput("animacion-social", () => AnimacionSocialAgent.instance.run(animacionInput));
  });

  it("AnimacionEmailAgent", async () => {
    await assertOutput("animacion-email", () => AnimacionEmailAgent.instance.run(animacionInput));
  });

  it("AnimacionReviewsAgent", async () => {
    await assertOutput("animacion-reviews", () => AnimacionReviewsAgent.instance.run(animacionInput));
  });

  it("AnimacionAnalyticsAgent", async () => {
    await assertOutput("animacion-analytics", () => AnimacionAnalyticsAgent.instance.run(animacionInput));
  });
});
