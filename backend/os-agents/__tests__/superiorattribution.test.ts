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
  SuperiorAttributionAnomalyAgent,
  SuperiorAttributionChannelAgent,
  SuperiorAttributionForecastAgent,
  SuperiorAttributionJourneyAgent,
  SuperiorAttributionMultiTouchAgent,
  SuperiorAttributionOfflineAgent,
  SuperiorAttributionReportAgent,
  SuperiorAttributionRevenueAgent,
  resetAllSuperiorAttributionAgentsForTests,
} from "../sectors/superiorattribution";

const AT_JSON = JSON.stringify({
  content: "SuperiorAttribution: 100% attributed, data-driven 24h, revenue <5m, fraud >95%, budget sim <10s, omnichannel.",
  score: 91,
  highlights: ["100% attributed", "Revenue <5m", "Fraud >95%"],
  metrics: ["Attribution coverage"],
});

const superiorAttributionInput = {
  userId: "00000000-0000-0000-0000-00000000at01",
  sector: "retail",
  brand: "Retail demo",
  attributionBrief: "Paid + organic + offline stores",
  metricsBrief: "ROI · fraud rate · revenue lag",
};

type SuperiorAttributionOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorAttribution agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(AT_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorAttributionAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorAttributionOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorAttributionMultiTouchAgent", async () => {
    await assertOutput("superiorattribution-multitouch", () =>
      SuperiorAttributionMultiTouchAgent.instance.run(superiorAttributionInput),
    );
  });

  it("SuperiorAttributionChannelAgent", async () => {
    await assertOutput("superiorattribution-channel", () =>
      SuperiorAttributionChannelAgent.instance.run(superiorAttributionInput),
    );
  });

  it("SuperiorAttributionRevenueAgent", async () => {
    await assertOutput("superiorattribution-revenue", () =>
      SuperiorAttributionRevenueAgent.instance.run(superiorAttributionInput),
    );
  });

  it("SuperiorAttributionJourneyAgent", async () => {
    await assertOutput("superiorattribution-journey", () =>
      SuperiorAttributionJourneyAgent.instance.run(superiorAttributionInput),
    );
  });

  it("SuperiorAttributionOfflineAgent", async () => {
    await assertOutput("superiorattribution-offline", () =>
      SuperiorAttributionOfflineAgent.instance.run(superiorAttributionInput),
    );
  });

  it("SuperiorAttributionForecastAgent", async () => {
    await assertOutput("superiorattribution-forecast", () =>
      SuperiorAttributionForecastAgent.instance.run(superiorAttributionInput),
    );
  });

  it("SuperiorAttributionAnomalyAgent", async () => {
    await assertOutput("superiorattribution-anomaly", () =>
      SuperiorAttributionAnomalyAgent.instance.run(superiorAttributionInput),
    );
  });

  it("SuperiorAttributionReportAgent", async () => {
    await assertOutput("superiorattribution-report", () =>
      SuperiorAttributionReportAgent.instance.run(superiorAttributionInput),
    );
  });
});
