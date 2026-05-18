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
  CartAbandonmentAgent,
  EcommerceAdsAgent,
  EcommerceAnalyticsAgent,
  EcommerceAuditAgent,
  EcommercePersonalizationAgent,
  EcommerceSEOAgent,
  InventoryIntelAgent,
  ProductOptimizationAgent,
  resetAllEcommerceAgentsForTests,
} from "../sectors/ecommerce";

const EC_JSON = JSON.stringify({
  content:
    "eCommerce: auditoría <5 min, carrito >35%, ROAS >40%, recomendaciones >85%, SEO <2 min, LTV +30% 90d.",
  score: 94,
  highlights: ["<5 min audit", ">35% cart", "+30% LTV"],
  metrics: ["Cart recovery rate"],
});

const ecommerceInput = {
  userId: "00000000-0000-0000-0000-00000000ec01",
  sector: "retail",
  brand: "Tienda demo",
  ecommerceBrief: "eCommerce · conversión",
  metricsBrief: "Carrito · ROAS · LTV",
};

type EcommerceOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Ecommerce agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(EC_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllEcommerceAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as EcommerceOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("EcommerceAuditAgent", async () => {
    await assertOutput("ecommerce-ecommerceaudit", () => EcommerceAuditAgent.instance.run(ecommerceInput));
  });

  it("ProductOptimizationAgent", async () => {
    await assertOutput("ecommerce-productoptimization", () => ProductOptimizationAgent.instance.run(ecommerceInput));
  });

  it("CartAbandonmentAgent", async () => {
    await assertOutput("ecommerce-cartabandonment", () => CartAbandonmentAgent.instance.run(ecommerceInput));
  });

  it("EcommercePersonalizationAgent", async () => {
    await assertOutput("ecommerce-ecommercepersonalization", () =>
      EcommercePersonalizationAgent.instance.run(ecommerceInput),
    );
  });

  it("EcommerceSEOAgent", async () => {
    await assertOutput("ecommerce-ecommerceseo", () => EcommerceSEOAgent.instance.run(ecommerceInput));
  });

  it("EcommerceAdsAgent", async () => {
    await assertOutput("ecommerce-ecommerceads", () => EcommerceAdsAgent.instance.run(ecommerceInput));
  });

  it("InventoryIntelAgent", async () => {
    await assertOutput("ecommerce-inventoryintel", () => InventoryIntelAgent.instance.run(ecommerceInput));
  });

  it("EcommerceAnalyticsAgent", async () => {
    await assertOutput("ecommerce-ecommerceanalytics", () => EcommerceAnalyticsAgent.instance.run(ecommerceInput));
  });
});
