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
  KlaviyoABTestAgent,
  KlaviyoAnalyticsAgent,
  KlaviyoAuthAgent,
  KlaviyoCampaignAgent,
  KlaviyoFlowAgent,
  KlaviyoSegmentAgent,
  KlaviyoSyncAgent,
  KlaviyoTemplateAgent,
  resetAllKlaviyoAgentsForTests,
} from "../sectors/klaviyo";

const KL_JSON = JSON.stringify({
  content:
    "Klaviyo: API key v2, flows cart 1h/24h/72h, OR>35% CTR>3% unsub<0.2%, VIP/at-risk/new segments, SMS opt-in.",
  score: 91,
  highlights: ["Welcome 3 emails", "Sync webhooks", "A/B subject"],
  metrics: ["Open rate"],
});

const klaviyoInput = {
  userId: "00000000-0000-0000-0000-00000000kl01",
  sector: "ecommerce",
  brand: "Klaviyo Demo",
  verticalBrief: "DTC",
  metricsBrief: "Winback flows",
};

type KlaviyoOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Klaviyo agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(KL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllKlaviyoAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as KlaviyoOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("KlaviyoAuthAgent", async () => {
    await assertOutput("klaviyo-auth", () => KlaviyoAuthAgent.instance.run(klaviyoInput));
  });

  it("KlaviyoSegmentAgent", async () => {
    await assertOutput("klaviyo-segment", () => KlaviyoSegmentAgent.instance.run(klaviyoInput));
  });

  it("KlaviyoFlowAgent", async () => {
    await assertOutput("klaviyo-flow", () => KlaviyoFlowAgent.instance.run(klaviyoInput));
  });

  it("KlaviyoCampaignAgent", async () => {
    await assertOutput("klaviyo-campaign", () => KlaviyoCampaignAgent.instance.run(klaviyoInput));
  });

  it("KlaviyoTemplateAgent", async () => {
    await assertOutput("klaviyo-template", () => KlaviyoTemplateAgent.instance.run(klaviyoInput));
  });

  it("KlaviyoAnalyticsAgent", async () => {
    await assertOutput("klaviyo-analytics", () => KlaviyoAnalyticsAgent.instance.run(klaviyoInput));
  });

  it("KlaviyoSyncAgent", async () => {
    await assertOutput("klaviyo-sync", () => KlaviyoSyncAgent.instance.run(klaviyoInput));
  });

  it("KlaviyoABTestAgent", async () => {
    await assertOutput("klaviyo-abtest", () => KlaviyoABTestAgent.instance.run(klaviyoInput));
  });
});
