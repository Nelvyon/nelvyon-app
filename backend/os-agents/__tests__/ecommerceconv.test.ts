// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const dbMock = { query: queryMock };

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => dbMock,
  },
}));

const llmMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: llmMock }),
  },
}));

import {
  EcommerceConvCarritoAgent,
  EcommerceConvCheckoutAgent,
  EcommerceConvFidelizacionAgent,
  EcommerceConvPersonalizacionAgent,
  EcommerceConvPreciosAgent,
  EcommerceConvProductoAgent,
  EcommerceConvReviewsAgent,
  EcommerceConvUpsellAgent,
  resetAllEcommerceConvAgentsForTests,
} from "../sectors/ecommerceconv";

const ECOMMERCE_CONV_JSON = JSON.stringify({
  result: "Ecommerce conversional OS: carrito, upsell, PDP IA, checkout y precios dinámicos con guardrails.",
  score: 89,
  recommendations: ["A/B carrito 72h", "Schema Product", "Floor price legal"],
});

const ecommerceConvInput = {
  userId: "00000000-0000-0000-0000-00000000ec01",
  businessName: "Tienda demo",
  services: ["Shopify", "Klaviyo"],
  targets: ["EU", "Mobile"],
  metadata: { program: "ecommerceconv_v1" },
};

describe("EcommerceConv agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(ECOMMERCE_CONV_JSON);
    resetAllEcommerceConvAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("EcommerceConvCarritoAgent", async () => {
    await assertOutput("ecommerceconv-carrito", () => EcommerceConvCarritoAgent.instance().run(ecommerceConvInput));
  });
  it("EcommerceConvUpsellAgent", async () => {
    await assertOutput("ecommerceconv-upsell", () => EcommerceConvUpsellAgent.instance().run(ecommerceConvInput));
  });
  it("EcommerceConvProductoAgent", async () => {
    await assertOutput("ecommerceconv-producto", () => EcommerceConvProductoAgent.instance().run(ecommerceConvInput));
  });
  it("EcommerceConvCheckoutAgent", async () => {
    await assertOutput("ecommerceconv-checkout", () => EcommerceConvCheckoutAgent.instance().run(ecommerceConvInput));
  });
  it("EcommerceConvPersonalizacionAgent", async () => {
    await assertOutput("ecommerceconv-personalizacion", () =>
      EcommerceConvPersonalizacionAgent.instance().run(ecommerceConvInput),
    );
  });
  it("EcommerceConvReviewsAgent", async () => {
    await assertOutput("ecommerceconv-reviews", () => EcommerceConvReviewsAgent.instance().run(ecommerceConvInput));
  });
  it("EcommerceConvFidelizacionAgent", async () => {
    await assertOutput("ecommerceconv-fidelizacion", () =>
      EcommerceConvFidelizacionAgent.instance().run(ecommerceConvInput),
    );
  });
  it("EcommerceConvPreciosAgent", async () => {
    await assertOutput("ecommerceconv-precios", () => EcommerceConvPreciosAgent.instance().run(ecommerceConvInput));
  });
});
