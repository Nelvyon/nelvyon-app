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
  AppBuilderWhiteLabelAnalyticsAgent,
  AppBuilderWhiteLabelBuilderAgent,
  AppBuilderWhiteLabelDesignAgent,
  AppBuilderWhiteLabelIntegrationAgent,
  AppBuilderWhiteLabelMonetizationAgent,
  AppBuilderWhiteLabelPublishAgent,
  AppBuilderWhiteLabelReportAgent,
  AppBuilderWhiteLabelUpdateAgent,
  resetAllAppBuilderWhiteLabelAgentsForTests,
} from "../sectors/appbuilderwhitelabel";

const ABWL_JSON = JSON.stringify({
  content:
    "AppBuilderWhiteLabel: app <10 min, stores <48h, OTA sin downtime, branding 100%, PWA día 1, crash <0.1%.",
  score: 94,
  highlights: ["<10 min", "PWA day 1", "<0.1% crash"],
  metrics: ["Crash-free sessions"],
});

const appBuilderWhiteLabelInput = {
  userId: "00000000-0000-0000-0000-00000000ab01",
  sector: "saas",
  brand: "SaaS demo",
  appBrief: "White-label · PWA · OTA",
  metricsBrief: "DAU · crash rate",
};

type AppBuilderWhiteLabelOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("AppBuilderWhiteLabel agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(ABWL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllAppBuilderWhiteLabelAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as AppBuilderWhiteLabelOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("AppBuilderWhiteLabelDesignAgent", async () => {
    await assertOutput("appbuilderwhitelabel-design", () => AppBuilderWhiteLabelDesignAgent.instance.run(appBuilderWhiteLabelInput));
  });

  it("AppBuilderWhiteLabelBuilderAgent", async () => {
    await assertOutput("appbuilderwhitelabel-builder", () => AppBuilderWhiteLabelBuilderAgent.instance.run(appBuilderWhiteLabelInput));
  });

  it("AppBuilderWhiteLabelPublishAgent", async () => {
    await assertOutput("appbuilderwhitelabel-publish", () => AppBuilderWhiteLabelPublishAgent.instance.run(appBuilderWhiteLabelInput));
  });

  it("AppBuilderWhiteLabelIntegrationAgent", async () => {
    await assertOutput("appbuilderwhitelabel-integration", () =>
      AppBuilderWhiteLabelIntegrationAgent.instance.run(appBuilderWhiteLabelInput),
    );
  });

  it("AppBuilderWhiteLabelAnalyticsAgent", async () => {
    await assertOutput("appbuilderwhitelabel-analytics", () =>
      AppBuilderWhiteLabelAnalyticsAgent.instance.run(appBuilderWhiteLabelInput),
    );
  });

  it("AppBuilderWhiteLabelUpdateAgent", async () => {
    await assertOutput("appbuilderwhitelabel-update", () => AppBuilderWhiteLabelUpdateAgent.instance.run(appBuilderWhiteLabelInput));
  });

  it("AppBuilderWhiteLabelMonetizationAgent", async () => {
    await assertOutput("appbuilderwhitelabel-monetization", () =>
      AppBuilderWhiteLabelMonetizationAgent.instance.run(appBuilderWhiteLabelInput),
    );
  });

  it("AppBuilderWhiteLabelReportAgent", async () => {
    await assertOutput("appbuilderwhitelabel-report", () => AppBuilderWhiteLabelReportAgent.instance.run(appBuilderWhiteLabelInput));
  });
});
