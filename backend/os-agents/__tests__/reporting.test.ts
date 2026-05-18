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
  ReportingClientStoryAgent,
  ReportingCompetitiveContextAgent,
  ReportingExecutiveSummaryAgent,
  ReportingInsightExtractorAgent,
  ReportingKpiNarrativeAgent,
  ReportingNextStepsAgent,
  ReportingRecommendationAgent,
  ReportingVisualDescriptorAgent,
  resetAllReportingAgentsForTests,
} from "../sectors/reporting";

const SAMPLE_JSON = JSON.stringify({
  content: "CLARITY: Context, Lens, Action, Results, Impact, Track, You — bloque listo para PDF.",
  score: 88,
  sections: ["Resumen", "KPIs", "Visual", "Anexos"],
  highlights: ["+12% eficiencia operativa vs período anterior", "NPS estable pese a expansión de base"],
});

const baseInput = {
  userId: "00000000-0000-0000-0000-0000000000ee",
  sector: "saas",
  clientName: "Acme Analytics",
  period: "Enero–Marzo 2026",
  metrics: { mrr: "48000", churn: "2.1%", leads: "340" },
  brandColor: "#14b8a6",
};

describe("Reporting PDF branded agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SAMPLE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllReportingAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertValid(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      sections: string[];
      highlights: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.sections.length).toBeGreaterThanOrEqual(1);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
  }

  it("ReportingExecutiveSummaryAgent", async () => {
    await assertValid("reporting-executive-summary", () => ReportingExecutiveSummaryAgent.instance.run(baseInput));
  });

  it("ReportingKpiNarrativeAgent", async () => {
    await assertValid("reporting-kpi-narrative", () => ReportingKpiNarrativeAgent.instance.run(baseInput));
  });

  it("ReportingInsightExtractorAgent", async () => {
    await assertValid("reporting-insight-extractor", () => ReportingInsightExtractorAgent.instance.run(baseInput));
  });

  it("ReportingRecommendationAgent", async () => {
    await assertValid("reporting-recommendation", () => ReportingRecommendationAgent.instance.run(baseInput));
  });

  it("ReportingCompetitiveContextAgent", async () => {
    await assertValid("reporting-competitive-context", () => ReportingCompetitiveContextAgent.instance.run(baseInput));
  });

  it("ReportingVisualDescriptorAgent", async () => {
    await assertValid("reporting-visual-descriptor", () => ReportingVisualDescriptorAgent.instance.run(baseInput));
  });

  it("ReportingClientStoryAgent", async () => {
    await assertValid("reporting-client-story", () => ReportingClientStoryAgent.instance.run(baseInput));
  });

  it("ReportingNextStepsAgent", async () => {
    await assertValid("reporting-next-steps", () => ReportingNextStepsAgent.instance.run(baseInput));
  });
});
