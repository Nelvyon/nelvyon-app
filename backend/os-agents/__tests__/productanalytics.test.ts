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
  DAUMAUAgent,
  EventTrackingAgent,
  ExperimentAnalyticsAgent,
  FeatureAdoptionAgent,
  FunnelAnalyticsAgent,
  PredictiveProductAgent,
  RetentionAnalyticsAgent,
  UserJourneyAgent,
  resetAllProductAnalyticsAgentsForTests,
} from "../sectors/productanalytics";

const PA_JSON = JSON.stringify({
  content:
    "Product analytics: eventos <5 min, funnel <60 s, cohortes 24 h, adoption RT, churn >87%, 0 técnico.",
  score: 94,
  highlights: ["<5 min events", "<60 s funnel", ">87% churn"],
  metrics: ["Event setup time"],
});

const productAnalyticsInput = {
  userId: "00000000-0000-0000-0000-00000000pa01",
  sector: "saas",
  brand: "SaaS demo",
  productAnalyticsBrief: "Product analytics · eventos",
  metricsBrief: "Funnel · retención · churn",
};

type ProductAnalyticsOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("ProductAnalytics agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PA_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllProductAnalyticsAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ProductAnalyticsOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("EventTrackingAgent", async () => {
    await assertOutput("productanalytics-eventtracking", () => EventTrackingAgent.instance.run(productAnalyticsInput));
  });

  it("FunnelAnalyticsAgent", async () => {
    await assertOutput("productanalytics-funnelanalytics", () =>
      FunnelAnalyticsAgent.instance.run(productAnalyticsInput),
    );
  });

  it("RetentionAnalyticsAgent", async () => {
    await assertOutput("productanalytics-retentionanalytics", () =>
      RetentionAnalyticsAgent.instance.run(productAnalyticsInput),
    );
  });

  it("FeatureAdoptionAgent", async () => {
    await assertOutput("productanalytics-featureadoption", () =>
      FeatureAdoptionAgent.instance.run(productAnalyticsInput),
    );
  });

  it("UserJourneyAgent", async () => {
    await assertOutput("productanalytics-userjourney", () => UserJourneyAgent.instance.run(productAnalyticsInput));
  });

  it("DAUMAUAgent", async () => {
    await assertOutput("productanalytics-daumau", () => DAUMAUAgent.instance.run(productAnalyticsInput));
  });

  it("ExperimentAnalyticsAgent", async () => {
    await assertOutput("productanalytics-experimentanalytics", () =>
      ExperimentAnalyticsAgent.instance.run(productAnalyticsInput),
    );
  });

  it("PredictiveProductAgent", async () => {
    await assertOutput("productanalytics-predictiveproduct", () =>
      PredictiveProductAgent.instance.run(productAnalyticsInput),
    );
  });
});
