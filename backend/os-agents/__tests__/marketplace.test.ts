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
  MarketplaceAnalyticsAgent,
  MarketplaceCategoryAgent,
  MarketplaceListingAgent,
  MarketplacePayoutAgent,
  MarketplaceQAAgent,
  MarketplaceRecommenderAgent,
  MarketplaceReviewAgent,
  MarketplaceSearchAgent,
  resetAllMarketplaceAgentsForTests,
} from "../sectors/marketplace";

const MP_JSON = JSON.stringify({
  content:
    "Marketplace: listing 19€/mes, QA latencia <3s, split 70/30, rating umbral 3.5, categoría SEO.",
  score: 91,
  highlights: ["70/30", "Min 9€ o free", "QA gate"],
  metrics: ["installs", "MRR"],
});

const marketplaceInput = {
  userId: "00000000-0000-0000-0000-00000000mp01",
  sector: "retail",
  brand: "TiendaDemo",
  developerId: "00000000-0000-0000-0000-00000000d001",
  listingAgentId: "ext-seo-pack",
  priceMonthlyEur: 19,
  useCaseBrief: "SEO local para 10 tiendas",
  metricsBrief: "Primera publicación",
};

type MarketplaceOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Marketplace agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(MP_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllMarketplaceAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as MarketplaceOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("MarketplaceListingAgent", async () => {
    await assertOutput("marketplace-listing", () => MarketplaceListingAgent.instance.run(marketplaceInput));
  });

  it("MarketplaceReviewAgent", async () => {
    await assertOutput("marketplace-review", () => MarketplaceReviewAgent.instance.run(marketplaceInput));
  });

  it("MarketplacePayoutAgent", async () => {
    await assertOutput("marketplace-payout", () => MarketplacePayoutAgent.instance.run(marketplaceInput));
  });

  it("MarketplaceQAAgent", async () => {
    await assertOutput("marketplace-qa", () => MarketplaceQAAgent.instance.run(marketplaceInput));
  });

  it("MarketplaceCategoryAgent", async () => {
    await assertOutput("marketplace-category", () => MarketplaceCategoryAgent.instance.run(marketplaceInput));
  });

  it("MarketplaceSearchAgent", async () => {
    await assertOutput("marketplace-search", () => MarketplaceSearchAgent.instance.run(marketplaceInput));
  });

  it("MarketplaceAnalyticsAgent", async () => {
    await assertOutput("marketplace-analytics", () => MarketplaceAnalyticsAgent.instance.run(marketplaceInput));
  });

  it("MarketplaceRecommenderAgent", async () => {
    await assertOutput("marketplace-recommender", () => MarketplaceRecommenderAgent.instance.run(marketplaceInput));
  });
});
