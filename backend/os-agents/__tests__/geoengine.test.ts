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
  GeoEngineCompetitorAgent,
  GeoEngineContentAgent,
  GeoEngineDetectorAgent,
  GeoEngineHeatmapAgent,
  GeoEngineLocalSEOAgent,
  GeoEnginePricingAgent,
  GeoEngineReportAgent,
  GeoEngineTargetingAgent,
  resetAllGeoEngineAgentsForTests,
} from "../sectors/geoengine";

const GE_JSON = JSON.stringify({
  content:
    "GeoEngine: ES/MX/CO priority, GMB+NAP+LocalBusiness, PPP pricing, cultural localization, geo heatmaps.",
  score: 91,
  highlights: ["MX 60% PPP", "GMB optimized", "Cultural copy"],
  metrics: ["Geo conv rate"],
});

const geoEngineInput = {
  userId: "00000000-0000-0000-0000-00000000ge01",
  sector: "retail",
  brand: "Marca multi-país",
  geoBrief: "México + Colombia · retail",
  metricsBrief: "Conv por ciudad",
};

type GeoEngineOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("GeoEngine agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(GE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllGeoEngineAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as GeoEngineOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("GeoEngineDetectorAgent", async () => {
    await assertOutput("geoengine-detector", () => GeoEngineDetectorAgent.instance.run(geoEngineInput));
  });

  it("GeoEngineTargetingAgent", async () => {
    await assertOutput("geoengine-targeting", () => GeoEngineTargetingAgent.instance.run(geoEngineInput));
  });

  it("GeoEngineLocalSEOAgent", async () => {
    await assertOutput("geoengine-localseo", () => GeoEngineLocalSEOAgent.instance.run(geoEngineInput));
  });

  it("GeoEngineCompetitorAgent", async () => {
    await assertOutput("geoengine-competitor", () => GeoEngineCompetitorAgent.instance.run(geoEngineInput));
  });

  it("GeoEnginePricingAgent", async () => {
    await assertOutput("geoengine-pricing", () => GeoEnginePricingAgent.instance.run(geoEngineInput));
  });

  it("GeoEngineContentAgent", async () => {
    await assertOutput("geoengine-content", () => GeoEngineContentAgent.instance.run(geoEngineInput));
  });

  it("GeoEngineHeatmapAgent", async () => {
    await assertOutput("geoengine-heatmap", () => GeoEngineHeatmapAgent.instance.run(geoEngineInput));
  });

  it("GeoEngineReportAgent", async () => {
    await assertOutput("geoengine-report", () => GeoEngineReportAgent.instance.run(geoEngineInput));
  });
});
