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
  KnowledgeBaseAIAnalyticsAgent,
  KnowledgeBaseAIIngestAgent,
  KnowledgeBaseAIMultilingualAgent,
  KnowledgeBaseAIOrganizeAgent,
  KnowledgeBaseAIPersonalizationAgent,
  KnowledgeBaseAISearchAgent,
  KnowledgeBaseAIUpdateAgent,
  KnowledgeBaseAIWriterAgent,
  resetAllKnowledgeBaseAIAgentsForTests,
} from "../sectors/knowledgebaseai";

const KBAI_JSON = JSON.stringify({
  content:
    "KnowledgeBaseAI: búsqueda <1s, artículo <30s, >95% FAQ, 40+ idiomas, 0% stale >30d, self-service >70%.",
  score: 94,
  highlights: ["<1s search", "<30s article", ">70% self-service"],
  metrics: ["FAQ coverage"],
});

const knowledgeBaseAIInput = {
  userId: "00000000-0000-0000-0000-00000000kb01",
  sector: "saas",
  brand: "SaaS demo",
  kbBrief: "KB IA · semántica · i18n",
  metricsBrief: "Self-service · FAQ",
};

type KnowledgeBaseAIOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("KnowledgeBaseAI agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(KBAI_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllKnowledgeBaseAIAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as KnowledgeBaseAIOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("KnowledgeBaseAIIngestAgent", async () => {
    await assertOutput("knowledgebaseai-ingest", () => KnowledgeBaseAIIngestAgent.instance.run(knowledgeBaseAIInput));
  });

  it("KnowledgeBaseAIOrganizeAgent", async () => {
    await assertOutput("knowledgebaseai-organize", () => KnowledgeBaseAIOrganizeAgent.instance.run(knowledgeBaseAIInput));
  });

  it("KnowledgeBaseAIWriterAgent", async () => {
    await assertOutput("knowledgebaseai-writer", () => KnowledgeBaseAIWriterAgent.instance.run(knowledgeBaseAIInput));
  });

  it("KnowledgeBaseAISearchAgent", async () => {
    await assertOutput("knowledgebaseai-search", () => KnowledgeBaseAISearchAgent.instance.run(knowledgeBaseAIInput));
  });

  it("KnowledgeBaseAIUpdateAgent", async () => {
    await assertOutput("knowledgebaseai-update", () => KnowledgeBaseAIUpdateAgent.instance.run(knowledgeBaseAIInput));
  });

  it("KnowledgeBaseAIAnalyticsAgent", async () => {
    await assertOutput("knowledgebaseai-analytics", () => KnowledgeBaseAIAnalyticsAgent.instance.run(knowledgeBaseAIInput));
  });

  it("KnowledgeBaseAIPersonalizationAgent", async () => {
    await assertOutput("knowledgebaseai-personalization", () =>
      KnowledgeBaseAIPersonalizationAgent.instance.run(knowledgeBaseAIInput),
    );
  });

  it("KnowledgeBaseAIMultilingualAgent", async () => {
    await assertOutput("knowledgebaseai-multilingual", () =>
      KnowledgeBaseAIMultilingualAgent.instance.run(knowledgeBaseAIInput),
    );
  });
});
