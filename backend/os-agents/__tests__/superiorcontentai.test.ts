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
  SuperiorContentAIAnalyticsAgent,
  SuperiorContentAIImageAgent,
  SuperiorContentAIPersonalizationAgent,
  SuperiorContentAIRepurposeAgent,
  SuperiorContentAISEOAgent,
  SuperiorContentAIStrategyAgent,
  SuperiorContentAITranslatorAgent,
  SuperiorContentAIWriterAgent,
  resetAllSuperiorContentAIAgentsForTests,
} from "../sectors/superiorcontentai";

const CA_JSON = JSON.stringify({
  content: "SuperiorContentAI: <30s 2000 words, E-E-A-T 90+, 6 formats <60s, 20 langs <45s, >5% engagement.",
  score: 91,
  highlights: ["E-E-A-T 90+", "6 formats <60s", ">5% engagement"],
  metrics: ["E-E-A-T score"],
});

const superiorContentAIInput = {
  userId: "00000000-0000-0000-0000-00000000ca01",
  sector: "media",
  brand: "Media demo",
  contentBrief: "Pilares temáticos · voz de marca",
  metricsBrief: "Engagement · E-E-A-T",
};

type SuperiorContentAIOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorContentAI agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CA_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorContentAIAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorContentAIOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorContentAIStrategyAgent", async () => {
    await assertOutput("superiorcontentai-strategy", () => SuperiorContentAIStrategyAgent.instance.run(superiorContentAIInput));
  });

  it("SuperiorContentAIWriterAgent", async () => {
    await assertOutput("superiorcontentai-writer", () => SuperiorContentAIWriterAgent.instance.run(superiorContentAIInput));
  });

  it("SuperiorContentAIImageAgent", async () => {
    await assertOutput("superiorcontentai-image", () => SuperiorContentAIImageAgent.instance.run(superiorContentAIInput));
  });

  it("SuperiorContentAISEOAgent", async () => {
    await assertOutput("superiorcontentai-seo", () => SuperiorContentAISEOAgent.instance.run(superiorContentAIInput));
  });

  it("SuperiorContentAIRepurposeAgent", async () => {
    await assertOutput("superiorcontentai-repurpose", () => SuperiorContentAIRepurposeAgent.instance.run(superiorContentAIInput));
  });

  it("SuperiorContentAITranslatorAgent", async () => {
    await assertOutput("superiorcontentai-translator", () => SuperiorContentAITranslatorAgent.instance.run(superiorContentAIInput));
  });

  it("SuperiorContentAIAnalyticsAgent", async () => {
    await assertOutput("superiorcontentai-analytics", () => SuperiorContentAIAnalyticsAgent.instance.run(superiorContentAIInput));
  });

  it("SuperiorContentAIPersonalizationAgent", async () => {
    await assertOutput("superiorcontentai-personalization", () =>
      SuperiorContentAIPersonalizationAgent.instance.run(superiorContentAIInput),
    );
  });
});
