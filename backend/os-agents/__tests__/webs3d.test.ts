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
  Webs3dAnalyticsAgent,
  Webs3dClientesAgent,
  Webs3dEmailAgent,
  Webs3dPortfolioAgent,
  Webs3dPreciosAgent,
  Webs3dReviewsAgent,
  Webs3dSEOAgent,
  Webs3dSocialAgent,
  resetAllWebs3dAgentsForTests,
} from "../sectors/webs3d";

const W3_JSON = JSON.stringify({
  result: "Webs3D: portfolio interactivo, outreach B2B y métricas de sesión.",
  score: 93,
  recommendations: ["Demo embed", "WebXR fallback", "Evento scene_complete"],
});

const webs3dInput = {
  userId: "00000000-0000-0000-0000-00000000w301",
  businessName: "Estudio demo",
  services: ["Three.js", "WebGL"],
  targets: ["marcas"],
};

describe("Webs3d agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(W3_JSON);
    resetAllWebs3dAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("Webs3dPortfolioAgent", async () => {
    await assertOutput("webs3d-portfolio", () => Webs3dPortfolioAgent.instance().run(webs3dInput));
  });

  it("Webs3dClientesAgent", async () => {
    await assertOutput("webs3d-clientes", () => Webs3dClientesAgent.instance().run(webs3dInput));
  });

  it("Webs3dPreciosAgent", async () => {
    await assertOutput("webs3d-precios", () => Webs3dPreciosAgent.instance().run(webs3dInput));
  });

  it("Webs3dSEOAgent", async () => {
    await assertOutput("webs3d-seo", () => Webs3dSEOAgent.instance().run(webs3dInput));
  });

  it("Webs3dSocialAgent", async () => {
    await assertOutput("webs3d-social", () => Webs3dSocialAgent.instance().run(webs3dInput));
  });

  it("Webs3dEmailAgent", async () => {
    await assertOutput("webs3d-email", () => Webs3dEmailAgent.instance().run(webs3dInput));
  });

  it("Webs3dReviewsAgent", async () => {
    await assertOutput("webs3d-reviews", () => Webs3dReviewsAgent.instance().run(webs3dInput));
  });

  it("Webs3dAnalyticsAgent", async () => {
    await assertOutput("webs3d-analytics", () => Webs3dAnalyticsAgent.instance().run(webs3dInput));
  });
});
