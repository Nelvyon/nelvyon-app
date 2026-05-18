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
  FunnelMultipasoABAgent,
  FunnelMultipasoAnalyticsAgent,
  FunnelMultipasoBuilderAgent,
  FunnelMultipasoConversionAgent,
  FunnelMultipasoEmailAgent,
  FunnelMultipasoReportAgent,
  FunnelMultipasoRetargetingAgent,
  FunnelMultipasoTrafficAgent,
  resetAllFunnelMultipasoAgentsForTests,
} from "../sectors/funnelmultipaso";

const FM_JSON = JSON.stringify({
  content:
    "FunnelMultipaso: funnel <5 min, >3% frío, email >15% recovery, A/B auto, RPV RT, retargeting <1h.",
  score: 93,
  highlights: ["Funnel <5 min", ">3% frío", "RPV RT"],
  metrics: ["Funnel conversion"],
});

const funnelMultipasoInput = {
  userId: "00000000-0000-0000-0000-00000000fm01",
  sector: "marketing",
  brand: "Marketing demo",
  funnelBrief: "Opt-in · tripwire · core · upsell",
  metricsBrief: "CR por paso · RPV",
};

type FunnelMultipasoOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("FunnelMultipaso agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(FM_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllFunnelMultipasoAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as FunnelMultipasoOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("FunnelMultipasoBuilderAgent", async () => {
    await assertOutput("funnelmultipaso-builder", () => FunnelMultipasoBuilderAgent.instance.run(funnelMultipasoInput));
  });

  it("FunnelMultipasoTrafficAgent", async () => {
    await assertOutput("funnelmultipaso-traffic", () => FunnelMultipasoTrafficAgent.instance.run(funnelMultipasoInput));
  });

  it("FunnelMultipasoConversionAgent", async () => {
    await assertOutput("funnelmultipaso-conversion", () =>
      FunnelMultipasoConversionAgent.instance.run(funnelMultipasoInput),
    );
  });

  it("FunnelMultipasoEmailAgent", async () => {
    await assertOutput("funnelmultipaso-email", () => FunnelMultipasoEmailAgent.instance.run(funnelMultipasoInput));
  });

  it("FunnelMultipasoRetargetingAgent", async () => {
    await assertOutput("funnelmultipaso-retargeting", () =>
      FunnelMultipasoRetargetingAgent.instance.run(funnelMultipasoInput),
    );
  });

  it("FunnelMultipasoAnalyticsAgent", async () => {
    await assertOutput("funnelmultipaso-analytics", () =>
      FunnelMultipasoAnalyticsAgent.instance.run(funnelMultipasoInput),
    );
  });

  it("FunnelMultipasoABAgent", async () => {
    await assertOutput("funnelmultipaso-ab", () => FunnelMultipasoABAgent.instance.run(funnelMultipasoInput));
  });

  it("FunnelMultipasoReportAgent", async () => {
    await assertOutput("funnelmultipaso-report", () => FunnelMultipasoReportAgent.instance.run(funnelMultipasoInput));
  });
});
