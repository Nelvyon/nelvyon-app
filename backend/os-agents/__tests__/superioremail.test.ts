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
  SuperiorEmailABAgent,
  SuperiorEmailAnalyticsAgent,
  SuperiorEmailAutomationAgent,
  SuperiorEmailCopyAgent,
  SuperiorEmailDeliverabilityAgent,
  SuperiorEmailDesignAgent,
  SuperiorEmailPersonalizationAgent,
  SuperiorEmailTimingAgent,
  resetAllSuperiorEmailAgentsForTests,
} from "../sectors/superioremail";

const SE_JSON = JSON.stringify({
  content:
    "SuperiorEmail: OR>45% CTR>8% inbox>98%, 1:1 personalization, 50+ node flows, exact revenue attribution.",
  score: 91,
  highlights: [">45% OR", "50+ nodes", ">98% inbox"],
  metrics: ["Email ROI"],
});

const superiorEmailInput = {
  userId: "00000000-0000-0000-0000-00000000se01",
  sector: "ecommerce",
  brand: "Tienda premium",
  emailBrief: "Campaña winback + carrito",
  metricsBrief: "OR CTR revenue",
};

type SuperiorEmailOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorEmail agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorEmailAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorEmailOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorEmailPersonalizationAgent", async () => {
    await assertOutput("superioremail-personalization", () =>
      SuperiorEmailPersonalizationAgent.instance.run(superiorEmailInput),
    );
  });

  it("SuperiorEmailTimingAgent", async () => {
    await assertOutput("superioremail-timing", () => SuperiorEmailTimingAgent.instance.run(superiorEmailInput));
  });

  it("SuperiorEmailCopyAgent", async () => {
    await assertOutput("superioremail-copy", () => SuperiorEmailCopyAgent.instance.run(superiorEmailInput));
  });

  it("SuperiorEmailDesignAgent", async () => {
    await assertOutput("superioremail-design", () => SuperiorEmailDesignAgent.instance.run(superiorEmailInput));
  });

  it("SuperiorEmailDeliverabilityAgent", async () => {
    await assertOutput("superioremail-deliverability", () =>
      SuperiorEmailDeliverabilityAgent.instance.run(superiorEmailInput),
    );
  });

  it("SuperiorEmailAutomationAgent", async () => {
    await assertOutput("superioremail-automation", () => SuperiorEmailAutomationAgent.instance.run(superiorEmailInput));
  });

  it("SuperiorEmailABAgent", async () => {
    await assertOutput("superioremail-ab", () => SuperiorEmailABAgent.instance.run(superiorEmailInput));
  });

  it("SuperiorEmailAnalyticsAgent", async () => {
    await assertOutput("superioremail-analytics", () => SuperiorEmailAnalyticsAgent.instance.run(superiorEmailInput));
  });
});
