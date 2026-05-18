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
  GamingAnalyticsAgent,
  GamingComunidadAgent,
  GamingEmailAgent,
  GamingLanzamientoAgent,
  GamingPreciosAgent,
  GamingReviewsAgent,
  GamingSEOAgent,
  GamingSocialAgent,
  resetAllGamingAgentsForTests,
} from "../sectors/gaming";

const GM_JSON = JSON.stringify({
  result: "Gaming: lanzamiento, comunidad y métricas de producto.",
  score: 93,
  recommendations: ["Wishlist push", "Discord roles", "Cohort D1"],
});

const gamingInput = {
  userId: "00000000-0000-0000-0000-00000000gm01",
  businessName: "Juego demo",
  services: ["Steam", "Switch"],
  targets: ["wishlist builders"],
};

describe("Gaming agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(GM_JSON);
    resetAllGamingAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("GamingLanzamientoAgent", async () => {
    await assertOutput("gaming-lanzamiento", () => GamingLanzamientoAgent.instance().run(gamingInput));
  });

  it("GamingComunidadAgent", async () => {
    await assertOutput("gaming-comunidad", () => GamingComunidadAgent.instance().run(gamingInput));
  });

  it("GamingPreciosAgent", async () => {
    await assertOutput("gaming-precios", () => GamingPreciosAgent.instance().run(gamingInput));
  });

  it("GamingSEOAgent", async () => {
    await assertOutput("gaming-seo", () => GamingSEOAgent.instance().run(gamingInput));
  });

  it("GamingSocialAgent", async () => {
    await assertOutput("gaming-social", () => GamingSocialAgent.instance().run(gamingInput));
  });

  it("GamingEmailAgent", async () => {
    await assertOutput("gaming-email", () => GamingEmailAgent.instance().run(gamingInput));
  });

  it("GamingReviewsAgent", async () => {
    await assertOutput("gaming-reviews", () => GamingReviewsAgent.instance().run(gamingInput));
  });

  it("GamingAnalyticsAgent", async () => {
    await assertOutput("gaming-analytics", () => GamingAnalyticsAgent.instance().run(gamingInput));
  });
});
