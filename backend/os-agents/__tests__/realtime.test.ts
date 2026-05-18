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
  RealtimeAlertAgent,
  RealtimeAnalyticsAgent,
  RealtimeDashboardAgent,
  RealtimeEventAgent,
  RealtimePersonalizationAgent,
  RealtimeSegmentAgent,
  RealtimeStreamAgent,
  RealtimeTriggerAgent,
  resetAllRealtimeAgentsForTests,
} from "../sectors/realtime";

const RT_JSON = JSON.stringify({
  content:
    "Realtime: <500ms events, 30s dashboard, +200% spike, hot lead/VIP segments, 2min personalized offer.",
  score: 91,
  highlights: ["<500ms", "30s refresh", "Spike alert"],
  metrics: ["Active users"],
});

const realtimeInput = {
  userId: "00000000-0000-0000-0000-00000000rt01",
  sector: "ecommerce",
  brand: "Tienda Live",
  streamBrief: "Web + app events",
  metricsBrief: "Conv/hora live",
};

type RealtimeOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Realtime agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(RT_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllRealtimeAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as RealtimeOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("RealtimeStreamAgent", async () => {
    await assertOutput("realtime-stream", () => RealtimeStreamAgent.instance.run(realtimeInput));
  });

  it("RealtimeEventAgent", async () => {
    await assertOutput("realtime-event", () => RealtimeEventAgent.instance.run(realtimeInput));
  });

  it("RealtimeTriggerAgent", async () => {
    await assertOutput("realtime-trigger", () => RealtimeTriggerAgent.instance.run(realtimeInput));
  });

  it("RealtimeAlertAgent", async () => {
    await assertOutput("realtime-alert", () => RealtimeAlertAgent.instance.run(realtimeInput));
  });

  it("RealtimeDashboardAgent", async () => {
    await assertOutput("realtime-dashboard", () => RealtimeDashboardAgent.instance.run(realtimeInput));
  });

  it("RealtimeSegmentAgent", async () => {
    await assertOutput("realtime-segment", () => RealtimeSegmentAgent.instance.run(realtimeInput));
  });

  it("RealtimePersonalizationAgent", async () => {
    await assertOutput("realtime-personalization", () => RealtimePersonalizationAgent.instance.run(realtimeInput));
  });

  it("RealtimeAnalyticsAgent", async () => {
    await assertOutput("realtime-analytics", () => RealtimeAnalyticsAgent.instance.run(realtimeInput));
  });
});
