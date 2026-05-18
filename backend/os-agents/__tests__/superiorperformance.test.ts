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
  SuperiorPerformanceAuditAgent,
  SuperiorPerformanceBundleAgent,
  SuperiorPerformanceCacheAgent,
  SuperiorPerformanceCDNAgent,
  SuperiorPerformanceDatabaseAgent,
  SuperiorPerformanceImageAgent,
  SuperiorPerformanceMonitorAgent,
  SuperiorPerformanceReportAgent,
  resetAllSuperiorPerformanceAgentsForTests,
} from "../sectors/superiorperformance";

const PF_JSON = JSON.stringify({
  content: "SuperiorPerformance: LCP <1s, CLS <0.05, INP <100ms, TTFB <200ms, PageSpeed 95+, audit <30s, alerts <2m.",
  score: 92,
  highlights: ["LCP <1s", "PageSpeed 95+", "Audit <30s"],
  metrics: ["CWV compliance"],
});

const superiorPerformanceInput = {
  userId: "00000000-0000-0000-0000-00000000pf01",
  sector: "saas",
  brand: "SaaS demo",
  performanceBrief: "Home + pricing · Core Web Vitals",
  metricsBrief: "LCP · INP · PageSpeed",
};

type SuperiorPerformanceOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorPerformance agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PF_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorPerformanceAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorPerformanceOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorPerformanceAuditAgent", async () => {
    await assertOutput("superiorperformance-audit", () => SuperiorPerformanceAuditAgent.instance.run(superiorPerformanceInput));
  });

  it("SuperiorPerformanceImageAgent", async () => {
    await assertOutput("superiorperformance-image", () => SuperiorPerformanceImageAgent.instance.run(superiorPerformanceInput));
  });

  it("SuperiorPerformanceCacheAgent", async () => {
    await assertOutput("superiorperformance-cache", () => SuperiorPerformanceCacheAgent.instance.run(superiorPerformanceInput));
  });

  it("SuperiorPerformanceBundleAgent", async () => {
    await assertOutput("superiorperformance-bundle", () => SuperiorPerformanceBundleAgent.instance.run(superiorPerformanceInput));
  });

  it("SuperiorPerformanceDatabaseAgent", async () => {
    await assertOutput("superiorperformance-database", () =>
      SuperiorPerformanceDatabaseAgent.instance.run(superiorPerformanceInput),
    );
  });

  it("SuperiorPerformanceMonitorAgent", async () => {
    await assertOutput("superiorperformance-monitor", () =>
      SuperiorPerformanceMonitorAgent.instance.run(superiorPerformanceInput),
    );
  });

  it("SuperiorPerformanceCDNAgent", async () => {
    await assertOutput("superiorperformance-cdn", () => SuperiorPerformanceCDNAgent.instance.run(superiorPerformanceInput));
  });

  it("SuperiorPerformanceReportAgent", async () => {
    await assertOutput("superiorperformance-report", () => SuperiorPerformanceReportAgent.instance.run(superiorPerformanceInput));
  });
});
