import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  CompetitiveAdsSpyAgent,
  CompetitiveBacklinkProfileAgent,
  CompetitiveContentGapAgent,
  CompetitivePositioningAnalystAgent,
  CompetitivePricingIntelAgent,
  CompetitiveReviewMinerAgent,
  CompetitiveSocialPresenceAgent,
  CompetitiveWinLossAgent,
  resetAllCompetitiveAgentsForTests,
} from "../sectors/competitive";

const SAMPLE_JSON = JSON.stringify({
  content: "Análisis ACT: Analyze, Compare, Tactical completados.",
  score: 82,
  insights: [
    "Reforzar prueba social cuantificada en landing frente al competidor.",
    "Cubrir tema educativo medio-funnel donde el rival domina snippets.",
    "Test A/B de oferta entrada con garantía visible en primera franja.",
  ],
});

const baseInput = {
  userId: "00000000-0000-0000-0000-0000000000aa",
  sector: "saas",
  competitorUrl: "https://rival.test",
  ownBrand: "Acme Labs",
  ownMetrics: { mrr_band: "1-5M" },
};

describe("Competitive RT agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SAMPLE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllCompetitiveAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertValid(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      insights: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.insights.length).toBeGreaterThanOrEqual(1);
  }

  it("CompetitivePositioningAnalystAgent", async () => {
    await assertValid("competitive-positioning-analyst", () => CompetitivePositioningAnalystAgent.instance.run(baseInput));
  });

  it("CompetitiveContentGapAgent", async () => {
    await assertValid("competitive-content-gap", () => CompetitiveContentGapAgent.instance.run(baseInput));
  });

  it("CompetitivePricingIntelAgent", async () => {
    await assertValid("competitive-pricing-intel", () => CompetitivePricingIntelAgent.instance.run(baseInput));
  });

  it("CompetitiveBacklinkProfileAgent", async () => {
    await assertValid("competitive-backlink-profile", () => CompetitiveBacklinkProfileAgent.instance.run(baseInput));
  });

  it("CompetitiveAdsSpyAgent", async () => {
    await assertValid("competitive-ads-spy", () => CompetitiveAdsSpyAgent.instance.run(baseInput));
  });

  it("CompetitiveSocialPresenceAgent", async () => {
    await assertValid("competitive-social-presence", () => CompetitiveSocialPresenceAgent.instance.run(baseInput));
  });

  it("CompetitiveReviewMinerAgent", async () => {
    await assertValid("competitive-review-miner", () => CompetitiveReviewMinerAgent.instance.run(baseInput));
  });

  it("CompetitiveWinLossAgent", async () => {
    await assertValid("competitive-win-loss", () => CompetitiveWinLossAgent.instance.run(baseInput));
  });
});
