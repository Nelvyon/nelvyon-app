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
  PublicApiAnalyticsAgent,
  PublicApiAuthAgent,
  PublicApiDocsAgent,
  PublicApiRateLimiterAgent,
  PublicApiRouterAgent,
  PublicApiSandboxAgent,
  PublicApiWebhookAgent,
  PublicApiWebhookDispatchAgent,
  resetAllPublicApiAgentsForTests,
} from "../sectors/publicapi";

const PA_JSON = JSON.stringify({
  content:
    "Public API v2: nlv_live_, rate headers, OpenAPI, webhooks billing.paid con retry 1s 5s 25s y suspend.",
  score: 92,
  highlights: ["X-RateLimit-*", "HMAC webhook", "Sandbox nlv_test_"],
  metrics: ["p95 ms"],
});

const publicApiInput = {
  userId: "00000000-0000-0000-0000-00000000pa01",
  sector: "integrations",
  brand: "PartnerApp",
  plan: "pro" as const,
  webhookEvent: "billing.paid" as const,
  endpointBrief: "POST /v2/agents/run",
  metricsBrief: "Rollout API keys",
};

type PublicApiOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("PublicApi agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PA_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllPublicApiAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as PublicApiOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("PublicApiAuthAgent", async () => {
    await assertOutput("publicapi-auth", () => PublicApiAuthAgent.instance.run(publicApiInput));
  });

  it("PublicApiRateLimiterAgent", async () => {
    await assertOutput("publicapi-rate-limiter", () => PublicApiRateLimiterAgent.instance.run(publicApiInput));
  });

  it("PublicApiRouterAgent", async () => {
    await assertOutput("publicapi-router", () => PublicApiRouterAgent.instance.run(publicApiInput));
  });

  it("PublicApiDocsAgent", async () => {
    await assertOutput("publicapi-docs", () => PublicApiDocsAgent.instance.run(publicApiInput));
  });

  it("PublicApiWebhookAgent", async () => {
    await assertOutput("publicapi-webhook", () => PublicApiWebhookAgent.instance.run(publicApiInput));
  });

  it("PublicApiWebhookDispatchAgent", async () => {
    await assertOutput("publicapi-webhook-dispatch", () => PublicApiWebhookDispatchAgent.instance.run(publicApiInput));
  });

  it("PublicApiAnalyticsAgent", async () => {
    await assertOutput("publicapi-analytics", () => PublicApiAnalyticsAgent.instance.run(publicApiInput));
  });

  it("PublicApiSandboxAgent", async () => {
    await assertOutput("publicapi-sandbox", () => PublicApiSandboxAgent.instance.run(publicApiInput));
  });
});
