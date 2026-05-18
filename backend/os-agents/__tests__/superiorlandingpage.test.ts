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
  SuperiorLandingPageABAgent,
  SuperiorLandingPageAnalyticsAgent,
  SuperiorLandingPageBuilderAgent,
  SuperiorLandingPageConversionAgent,
  SuperiorLandingPageCopyAgent,
  SuperiorLandingPagePersonalizationAgent,
  SuperiorLandingPageSEOAgent,
  SuperiorLandingPageSpeedAgent,
  resetAllSuperiorLandingPageAgentsForTests,
} from "../sectors/superiorlandingpage";

const LP_JSON = JSON.stringify({
  content: "SuperiorLandingPage: >8% CVR, LCP <1s, <15s build, 48h A/B, day-1 personalization, CRO 90+.",
  score: 91,
  highlights: [">8% CVR", "LCP <1s", "CRO 90+"],
  metrics: ["CVR"],
});

const superiorLandingPageInput = {
  userId: "00000000-0000-0000-0000-00000000lp01",
  sector: "saas",
  brand: "SaaS demo",
  landingBrief: "Lead gen · demo request",
  metricsBrief: "CVR · LCP · CRO score",
};

type SuperiorLandingPageOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorLandingPage agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(LP_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorLandingPageAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorLandingPageOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorLandingPageBuilderAgent", async () => {
    await assertOutput("superiorlandingpage-builder", () => SuperiorLandingPageBuilderAgent.instance.run(superiorLandingPageInput));
  });

  it("SuperiorLandingPageCopyAgent", async () => {
    await assertOutput("superiorlandingpage-copy", () => SuperiorLandingPageCopyAgent.instance.run(superiorLandingPageInput));
  });

  it("SuperiorLandingPageSEOAgent", async () => {
    await assertOutput("superiorlandingpage-seo", () => SuperiorLandingPageSEOAgent.instance.run(superiorLandingPageInput));
  });

  it("SuperiorLandingPageABAgent", async () => {
    await assertOutput("superiorlandingpage-ab", () => SuperiorLandingPageABAgent.instance.run(superiorLandingPageInput));
  });

  it("SuperiorLandingPagePersonalizationAgent", async () => {
    await assertOutput("superiorlandingpage-personalization", () =>
      SuperiorLandingPagePersonalizationAgent.instance.run(superiorLandingPageInput),
    );
  });

  it("SuperiorLandingPageAnalyticsAgent", async () => {
    await assertOutput("superiorlandingpage-analytics", () =>
      SuperiorLandingPageAnalyticsAgent.instance.run(superiorLandingPageInput),
    );
  });

  it("SuperiorLandingPageSpeedAgent", async () => {
    await assertOutput("superiorlandingpage-speed", () => SuperiorLandingPageSpeedAgent.instance.run(superiorLandingPageInput));
  });

  it("SuperiorLandingPageConversionAgent", async () => {
    await assertOutput("superiorlandingpage-conversion", () =>
      SuperiorLandingPageConversionAgent.instance.run(superiorLandingPageInput),
    );
  });
});
