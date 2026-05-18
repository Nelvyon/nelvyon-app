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
  ContentScoreAnalyzerAgent,
  ContentScoreBenchmarkAgent,
  ContentScoreCTAAgent,
  ContentScoreRankAgent,
  ContentScoreReportAgent,
  ContentScoreRewriterAgent,
  ContentScoreSEOAgent,
  ContentScoreToneAgent,
  resetAllContentScoreAgentsForTests,
} from "../sectors/contentscore";

const CS_JSON = JSON.stringify({
  content:
    "ContentScore: Flesch ES, SEO 1-3%, CTA action verb, <70 rewrite, >90 Content Elite, SERP top10 benchmark.",
  score: 91,
  highlights: ["Content Elite", "CTA visible", "SERP gap"],
  metrics: ["Global score"],
});

const contentScoreInput = {
  userId: "00000000-0000-0000-0000-00000000cs01",
  sector: "ecommerce",
  brand: "Tienda Demo",
  contentBrief: "Landing producto genérica sin CTA claro.",
  metricsBrief: "Target score >90",
};

type ContentScoreOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("ContentScore agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CS_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllContentScoreAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ContentScoreOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("ContentScoreAnalyzerAgent", async () => {
    await assertOutput("contentscore-analyzer", () => ContentScoreAnalyzerAgent.instance.run(contentScoreInput));
  });

  it("ContentScoreRankAgent", async () => {
    await assertOutput("contentscore-rank", () => ContentScoreRankAgent.instance.run(contentScoreInput));
  });

  it("ContentScoreRewriterAgent", async () => {
    await assertOutput("contentscore-rewriter", () => ContentScoreRewriterAgent.instance.run(contentScoreInput));
  });

  it("ContentScoreSEOAgent", async () => {
    await assertOutput("contentscore-seo", () => ContentScoreSEOAgent.instance.run(contentScoreInput));
  });

  it("ContentScoreCTAAgent", async () => {
    await assertOutput("contentscore-cta", () => ContentScoreCTAAgent.instance.run(contentScoreInput));
  });

  it("ContentScoreToneAgent", async () => {
    await assertOutput("contentscore-tone", () => ContentScoreToneAgent.instance.run(contentScoreInput));
  });

  it("ContentScoreBenchmarkAgent", async () => {
    await assertOutput("contentscore-benchmark", () => ContentScoreBenchmarkAgent.instance.run(contentScoreInput));
  });

  it("ContentScoreReportAgent", async () => {
    await assertOutput("contentscore-report", () => ContentScoreReportAgent.instance.run(contentScoreInput));
  });
});
