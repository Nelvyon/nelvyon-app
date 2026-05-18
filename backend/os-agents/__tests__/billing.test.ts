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
  BillingAlertAgent,
  BillingCohortAgent,
  BillingDunningAgent,
  BillingForecastAgent,
  BillingInvoiceAgent,
  BillingPricingAgent,
  BillingRevenueAgent,
  BillingSubscriptionAgent,
  resetAllBillingAgentsForTests,
} from "../sectors/billing";

const BL_JSON = JSON.stringify({
  content:
    "Billing: >85% recuperación, MRR <1 min, churn revenue <2%, forecast >92%, 195 países, anomalías <5 min.",
  score: 94,
  highlights: [">85% recovery", "<1 min MRR", "<2% churn revenue"],
  metrics: ["MRR"],
});

const billingInput = {
  userId: "00000000-0000-0000-0000-00000000bl01",
  sector: "saas",
  brand: "SaaS demo",
  billingBrief: "Billing inteligente · MRR",
  metricsBrief: "MRR · churn · forecast",
};

type BillingOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Billing agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(BL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllBillingAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as BillingOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("BillingSubscriptionAgent", async () => {
    await assertOutput("billing-subscription", () => BillingSubscriptionAgent.instance.run(billingInput));
  });

  it("BillingDunningAgent", async () => {
    await assertOutput("billing-dunning", () => BillingDunningAgent.instance.run(billingInput));
  });

  it("BillingRevenueAgent", async () => {
    await assertOutput("billing-revenue", () => BillingRevenueAgent.instance.run(billingInput));
  });

  it("BillingForecastAgent", async () => {
    await assertOutput("billing-forecast", () => BillingForecastAgent.instance.run(billingInput));
  });

  it("BillingInvoiceAgent", async () => {
    await assertOutput("billing-invoice", () => BillingInvoiceAgent.instance.run(billingInput));
  });

  it("BillingPricingAgent", async () => {
    await assertOutput("billing-pricing", () => BillingPricingAgent.instance.run(billingInput));
  });

  it("BillingAlertAgent", async () => {
    await assertOutput("billing-alert", () => BillingAlertAgent.instance.run(billingInput));
  });

  it("BillingCohortAgent", async () => {
    await assertOutput("billing-cohort", () => BillingCohortAgent.instance.run(billingInput));
  });
});
