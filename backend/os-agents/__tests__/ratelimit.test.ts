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
  RateLimitAlerterAgent,
  RateLimitBudgetAgent,
  RateLimitEnforcerAgent,
  RateLimitReportAgent,
  RateLimitResetAgent,
  RateLimitThrottleAgent,
  RateLimitTrackerAgent,
  RateLimitUpgradeAgent,
  resetAllRateLimitAgentsForTests,
} from "../sectors/ratelimit";

const RL_JSON = JSON.stringify({
  content:
    "RateLimit: plan caps, X-RateLimit headers, 80/95% alerts, OpenAI budget, throttle, 3-day upgrade email.",
  score: 91,
  highlights: ["Starter 100/h", "Budget cap", "Upgrade email"],
  metrics: ["Remaining"],
});

const rateLimitInput = {
  userId: "00000000-0000-0000-0000-00000000rl01",
  sector: "saas",
  brand: "Cliente Demo",
  plan: "pro" as const,
  planBrief: "Pro 1000 req/h",
  metricsBrief: "80% alert threshold",
};

type RateLimitOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("RateLimit agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(RL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllRateLimitAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as RateLimitOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("RateLimitEnforcerAgent", async () => {
    await assertOutput("ratelimit-enforcer", () => RateLimitEnforcerAgent.instance.run(rateLimitInput));
  });

  it("RateLimitTrackerAgent", async () => {
    await assertOutput("ratelimit-tracker", () => RateLimitTrackerAgent.instance.run(rateLimitInput));
  });

  it("RateLimitAlerterAgent", async () => {
    await assertOutput("ratelimit-alerter", () => RateLimitAlerterAgent.instance.run(rateLimitInput));
  });

  it("RateLimitBudgetAgent", async () => {
    await assertOutput("ratelimit-budget", () => RateLimitBudgetAgent.instance.run(rateLimitInput));
  });

  it("RateLimitThrottleAgent", async () => {
    await assertOutput("ratelimit-throttle", () => RateLimitThrottleAgent.instance.run(rateLimitInput));
  });

  it("RateLimitResetAgent", async () => {
    await assertOutput("ratelimit-reset", () => RateLimitResetAgent.instance.run(rateLimitInput));
  });

  it("RateLimitReportAgent", async () => {
    await assertOutput("ratelimit-report", () => RateLimitReportAgent.instance.run(rateLimitInput));
  });

  it("RateLimitUpgradeAgent", async () => {
    await assertOutput("ratelimit-upgrade", () => RateLimitUpgradeAgent.instance.run(rateLimitInput));
  });
});
