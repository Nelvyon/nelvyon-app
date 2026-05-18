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
  ObservabilityAlertAgent,
  ObservabilityAuditAgent,
  ObservabilityDashboardAgent,
  ObservabilityLoggerAgent,
  ObservabilityMetricsAgent,
  ObservabilityReportAgent,
  ObservabilityRetentionAgent,
  ObservabilityTracerAgent,
  resetAllObservabilityAgentsForTests,
} from "../sectors/observability";

const OB_JSON = JSON.stringify({
  content:
    "Observability: traces µs+tokens+€, SLO p95<2s error<0.5%, alerts Slack, retention 30/90d, weekly health.",
  score: 91,
  highlights: ["p95 latency", "LLM audit", "Retention tiers"],
  metrics: ["Error rate"],
});

const observabilityInput = {
  userId: "00000000-0000-0000-0000-00000000ob01",
  sector: "saas",
  brand: "NELVYON OS",
  environmentBrief: "prod EU",
  metricsBrief: "SLO p95 <2s",
};

type ObservabilityOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Observability agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(OB_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllObservabilityAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ObservabilityOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("ObservabilityTracerAgent", async () => {
    await assertOutput("observability-tracer", () => ObservabilityTracerAgent.instance.run(observabilityInput));
  });

  it("ObservabilityLoggerAgent", async () => {
    await assertOutput("observability-logger", () => ObservabilityLoggerAgent.instance.run(observabilityInput));
  });

  it("ObservabilityMetricsAgent", async () => {
    await assertOutput("observability-metrics", () => ObservabilityMetricsAgent.instance.run(observabilityInput));
  });

  it("ObservabilityAlertAgent", async () => {
    await assertOutput("observability-alert", () => ObservabilityAlertAgent.instance.run(observabilityInput));
  });

  it("ObservabilityDashboardAgent", async () => {
    await assertOutput("observability-dashboard", () => ObservabilityDashboardAgent.instance.run(observabilityInput));
  });

  it("ObservabilityAuditAgent", async () => {
    await assertOutput("observability-audit", () => ObservabilityAuditAgent.instance.run(observabilityInput));
  });

  it("ObservabilityRetentionAgent", async () => {
    await assertOutput("observability-retention", () => ObservabilityRetentionAgent.instance.run(observabilityInput));
  });

  it("ObservabilityReportAgent", async () => {
    await assertOutput("observability-report", () => ObservabilityReportAgent.instance.run(observabilityInput));
  });
});
