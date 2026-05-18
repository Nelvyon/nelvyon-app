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
  WooCommerceAbandonedCartAgent,
  WooCommerceAnalyticsAgent,
  WooCommerceAuthAgent,
  WooCommerceEmailAgent,
  WooCommerceOrderAgent,
  WooCommerceProductAgent,
  WooCommerceReviewAgent,
  WooCommerceSEOAgent,
  resetAllWooCommerceAgentsForTests,
} from "../sectors/woocommerce";

const WC_JSON = JSON.stringify({
  content:
    "WooCommerce: carrito 1h/24h/72h 5-10-15%, post-compra + upsell + review D+7, SEO <60/<160, VIP >500€.",
  score: 92,
  highlights: ["REST keys", "Schema Product", "Segment VIP"],
  metrics: ["AOV"],
});

const wooCommerceInput = {
  userId: "00000000-0000-0000-0000-00000000wc01",
  sector: "ecommerce",
  brand: "ShopDemo",
  storeUrl: "https://shop.example.com",
  segment: "vip" as const,
  metricsBrief: "Black Friday flows",
};

type WooCommerceOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("WooCommerce agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(WC_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllWooCommerceAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as WooCommerceOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("WooCommerceAuthAgent", async () => {
    await assertOutput("woocommerce-auth", () => WooCommerceAuthAgent.instance.run(wooCommerceInput));
  });

  it("WooCommerceProductAgent", async () => {
    await assertOutput("woocommerce-product", () => WooCommerceProductAgent.instance.run(wooCommerceInput));
  });

  it("WooCommerceOrderAgent", async () => {
    await assertOutput("woocommerce-order", () => WooCommerceOrderAgent.instance.run(wooCommerceInput));
  });

  it("WooCommerceAbandonedCartAgent", async () => {
    await assertOutput("woocommerce-abandoned-cart", () => WooCommerceAbandonedCartAgent.instance.run(wooCommerceInput));
  });

  it("WooCommerceSEOAgent", async () => {
    await assertOutput("woocommerce-seo", () => WooCommerceSEOAgent.instance.run(wooCommerceInput));
  });

  it("WooCommerceReviewAgent", async () => {
    await assertOutput("woocommerce-review", () => WooCommerceReviewAgent.instance.run(wooCommerceInput));
  });

  it("WooCommerceAnalyticsAgent", async () => {
    await assertOutput("woocommerce-analytics", () => WooCommerceAnalyticsAgent.instance.run(wooCommerceInput));
  });

  it("WooCommerceEmailAgent", async () => {
    await assertOutput("woocommerce-email", () => WooCommerceEmailAgent.instance.run(wooCommerceInput));
  });
});
