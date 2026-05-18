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
  SuperiorReportingAnomalyAgent,
  SuperiorReportingAttributionAgent,
  SuperiorReportingBenchmarkAgent,
  SuperiorReportingDashboardAgent,
  SuperiorReportingExportAgent,
  SuperiorReportingForecastAgent,
  SuperiorReportingNarrativeAgent,
  SuperiorReportingSchedulerAgent,
  resetAllSuperiorReportingAgentsForTests,
} from "../sectors/superiorreporting";

const SR_JSON = JSON.stringify({
  content: "SuperiorReporting: <30s dashboards, 99.9% schedules, <5s narrative, <2m anomalies, >88% forecast, <10s export.",
  score: 91,
  highlights: ["<30s dashboards", "99.9% schedules", ">88% forecast"],
  metrics: ["Dashboard latency"],
});

const superiorReportingInput = {
  userId: "00000000-0000-0000-0000-00000000rp01",
  sector: "retail",
  brand: "Retail demo",
  reportingBrief: "KPIs ejecutivos · informes semanales",
  metricsBrief: "Forecast accuracy · export SLA",
};

type SuperiorReportingOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorReporting agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SR_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorReportingAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorReportingOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorReportingDashboardAgent", async () => {
    await assertOutput("superiorreporting-dashboard", () => SuperiorReportingDashboardAgent.instance.run(superiorReportingInput));
  });

  it("SuperiorReportingSchedulerAgent", async () => {
    await assertOutput("superiorreporting-scheduler", () => SuperiorReportingSchedulerAgent.instance.run(superiorReportingInput));
  });

  it("SuperiorReportingNarrativeAgent", async () => {
    await assertOutput("superiorreporting-narrative", () => SuperiorReportingNarrativeAgent.instance.run(superiorReportingInput));
  });

  it("SuperiorReportingAnomalyAgent", async () => {
    await assertOutput("superiorreporting-anomaly", () => SuperiorReportingAnomalyAgent.instance.run(superiorReportingInput));
  });

  it("SuperiorReportingAttributionAgent", async () => {
    await assertOutput("superiorreporting-attribution", () =>
      SuperiorReportingAttributionAgent.instance.run(superiorReportingInput),
    );
  });

  it("SuperiorReportingForecastAgent", async () => {
    await assertOutput("superiorreporting-forecast", () => SuperiorReportingForecastAgent.instance.run(superiorReportingInput));
  });

  it("SuperiorReportingExportAgent", async () => {
    await assertOutput("superiorreporting-export", () => SuperiorReportingExportAgent.instance.run(superiorReportingInput));
  });

  it("SuperiorReportingBenchmarkAgent", async () => {
    await assertOutput("superiorreporting-benchmark", () => SuperiorReportingBenchmarkAgent.instance.run(superiorReportingInput));
  });
});
