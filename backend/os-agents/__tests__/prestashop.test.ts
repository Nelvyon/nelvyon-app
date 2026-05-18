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
  PrestaShopAbandonedCartAgent,
  PrestaShopAnalyticsAgent,
  PrestaShopAuthAgent,
  PrestaShopEmailAgent,
  PrestaShopOrderAgent,
  PrestaShopProductAgent,
  PrestaShopReviewAgent,
  PrestaShopSEOAgent,
  resetAllPrestaShopAgentsForTests,
} from "../sectors/prestashop";

const PS_JSON = JSON.stringify({
  content:
    "PrestaShop: WebService key, carrito 1h/24h/72h 5-10-15%, post-compra + upsell + review D+7, SEO <60/<160, ES/FR/IT, VIP >500€.",
  score: 92,
  highlights: ["WebService", "Friendly URL", "Segment VIP"],
  metrics: ["AOV"],
});

const prestashopInput = {
  userId: "00000000-0000-0000-0000-00000000ps01",
  sector: "ecommerce",
  brand: "PrestaDemo",
  storeUrl: "https://shop.example.com",
  segment: "vip" as const,
  metricsBrief: "Mercados ES/FR/IT",
};

type PrestaShopOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("PrestaShop agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PS_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllPrestaShopAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as PrestaShopOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("PrestaShopAuthAgent", async () => {
    await assertOutput("prestashop-auth", () => PrestaShopAuthAgent.instance.run(prestashopInput));
  });

  it("PrestaShopProductAgent", async () => {
    await assertOutput("prestashop-product", () => PrestaShopProductAgent.instance.run(prestashopInput));
  });

  it("PrestaShopOrderAgent", async () => {
    await assertOutput("prestashop-order", () => PrestaShopOrderAgent.instance.run(prestashopInput));
  });

  it("PrestaShopAbandonedCartAgent", async () => {
    await assertOutput("prestashop-abandoned-cart", () => PrestaShopAbandonedCartAgent.instance.run(prestashopInput));
  });

  it("PrestaShopSEOAgent", async () => {
    await assertOutput("prestashop-seo", () => PrestaShopSEOAgent.instance.run(prestashopInput));
  });

  it("PrestaShopReviewAgent", async () => {
    await assertOutput("prestashop-review", () => PrestaShopReviewAgent.instance.run(prestashopInput));
  });

  it("PrestaShopAnalyticsAgent", async () => {
    await assertOutput("prestashop-analytics", () => PrestaShopAnalyticsAgent.instance.run(prestashopInput));
  });

  it("PrestaShopEmailAgent", async () => {
    await assertOutput("prestashop-email", () => PrestaShopEmailAgent.instance.run(prestashopInput));
  });
});
