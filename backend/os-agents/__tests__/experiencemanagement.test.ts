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
  CESAgent,
  CSATAgent,
  ExperienceBenchmarkAgent,
  FeedbackActionAgent,
  JourneyAnalyticsAgent,
  NPSAgent,
  SentimentAnalysisAgent,
  VOCCollectionAgent,
  resetAllExperienceManagementAgentsForTests,
} from "../sectors/experiencemanagement";

const XM_JSON = JSON.stringify({
  content:
    "Experience: VOC 10+ fuentes, sentimiento <30 s, NPS <48 h, journey <1 h, feedback <5 min, benchmark semanal.",
  score: 94,
  highlights: ["10+ fuentes", "<30 s sentiment", "NPS <48 h"],
  metrics: ["VOC sources"],
});

const experienceManagementInput = {
  userId: "00000000-0000-0000-0000-00000000xm01",
  sector: "saas",
  brand: "SaaS demo",
  experienceManagementBrief: "Experience management · VOC",
  metricsBrief: "VOC · NPS · journey",
};

type ExperienceManagementOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("ExperienceManagement agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(XM_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllExperienceManagementAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ExperienceManagementOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("VOCCollectionAgent", async () => {
    await assertOutput("experiencemanagement-voccollection", () =>
      VOCCollectionAgent.instance.run(experienceManagementInput),
    );
  });

  it("SentimentAnalysisAgent", async () => {
    await assertOutput("experiencemanagement-sentimentanalysis", () =>
      SentimentAnalysisAgent.instance.run(experienceManagementInput),
    );
  });

  it("NPSAgent", async () => {
    await assertOutput("experiencemanagement-nps", () => NPSAgent.instance.run(experienceManagementInput));
  });

  it("CESAgent", async () => {
    await assertOutput("experiencemanagement-ces", () => CESAgent.instance.run(experienceManagementInput));
  });

  it("CSATAgent", async () => {
    await assertOutput("experiencemanagement-csat", () => CSATAgent.instance.run(experienceManagementInput));
  });

  it("JourneyAnalyticsAgent", async () => {
    await assertOutput("experiencemanagement-journeyanalytics", () =>
      JourneyAnalyticsAgent.instance.run(experienceManagementInput),
    );
  });

  it("FeedbackActionAgent", async () => {
    await assertOutput("experiencemanagement-feedbackaction", () =>
      FeedbackActionAgent.instance.run(experienceManagementInput),
    );
  });

  it("ExperienceBenchmarkAgent", async () => {
    await assertOutput("experiencemanagement-experiencebenchmark", () =>
      ExperienceBenchmarkAgent.instance.run(experienceManagementInput),
    );
  });
});
