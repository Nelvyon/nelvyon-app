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
  AudiovisualAnalyticsAgent,
  AudiovisualClientesAgent,
  AudiovisualEmailAgent,
  AudiovisualPortfolioAgent,
  AudiovisualPreciosAgent,
  AudiovisualReviewsAgent,
  AudiovisualSEOAgent,
  AudiovisualSocialAgent,
  resetAllAudiovisualAgentsForTests,
} from "../sectors/audiovisual";

const AV_JSON = JSON.stringify({
  result: "Producción audiovisual: portfolio, clientes corporativos, pricing y analytics.",
  score: 93,
  recommendations: ["Showreel IA", "Captación B2B", "Social video-first"],
});

const audiovisualInput = {
  userId: "00000000-0000-0000-0000-00000000av01",
  businessName: "Estudio demo",
  services: ["producción", "post-producción"],
  targets: ["marcas corporativas", "agencias"],
};

describe("Audiovisual agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AV_JSON);
    resetAllAudiovisualAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("AudiovisualPortfolioAgent", async () => {
    await assertOutput("audiovisual-portfolio", () => AudiovisualPortfolioAgent.instance.run(audiovisualInput));
  });

  it("AudiovisualClientesAgent", async () => {
    await assertOutput("audiovisual-clientes", () => AudiovisualClientesAgent.instance.run(audiovisualInput));
  });

  it("AudiovisualPreciosAgent", async () => {
    await assertOutput("audiovisual-precios", () => AudiovisualPreciosAgent.instance.run(audiovisualInput));
  });

  it("AudiovisualSEOAgent", async () => {
    await assertOutput("audiovisual-seo", () => AudiovisualSEOAgent.instance.run(audiovisualInput));
  });

  it("AudiovisualSocialAgent", async () => {
    await assertOutput("audiovisual-social", () => AudiovisualSocialAgent.instance.run(audiovisualInput));
  });

  it("AudiovisualEmailAgent", async () => {
    await assertOutput("audiovisual-email", () => AudiovisualEmailAgent.instance.run(audiovisualInput));
  });

  it("AudiovisualReviewsAgent", async () => {
    await assertOutput("audiovisual-reviews", () => AudiovisualReviewsAgent.instance.run(audiovisualInput));
  });

  it("AudiovisualAnalyticsAgent", async () => {
    await assertOutput("audiovisual-analytics", () => AudiovisualAnalyticsAgent.instance.run(audiovisualInput));
  });
});
