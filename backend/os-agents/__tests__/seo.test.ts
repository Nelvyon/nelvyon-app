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
  SeoContentGapAgent,
  SeoContentOptimizerAgent,
  SeoEEATBoosterAgent,
  SeoInternalLinkingAgent,
  SeoKeywordResearchAgent,
  SeoSchemaMarkupAgent,
  SeoSGEReadinessAgent,
  SeoTitleMetaAgent,
  resetAllSeoAgentsForTests,
} from "../sectors/seo";

const SAMPLE_JSON = JSON.stringify({
  content: "RANK: Research, Align, Nurture, Knowledge aplicado al brief SEO.",
  score: 79,
  recommendations: ["Unificar H1 con title semántico", "Añadir FAQ schema si hay objeciones recurrentes"],
  keywords: ["crm pymes", "software ventas", "pipeline ventas"],
});

const baseInput = {
  userId: "00000000-0000-0000-0000-0000000033cc",
  sector: "saas",
  keyword: "crm pymes",
  url: "https://demo.test/crm",
  content: "Contenido de prueba para optimización.",
  competitors: ["c1.com", "c2.com"],
};

describe("SEO on-page intelligence agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SAMPLE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSeoAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertValid(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      recommendations: string[];
      keywords: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(out.keywords.length).toBeGreaterThanOrEqual(1);
  }

  it("SeoKeywordResearchAgent", async () => {
    await assertValid("seo-keyword-research", () => SeoKeywordResearchAgent.instance.run(baseInput));
  });

  it("SeoContentOptimizerAgent", async () => {
    await assertValid("seo-content-optimizer", () => SeoContentOptimizerAgent.instance.run(baseInput));
  });

  it("SeoTitleMetaAgent", async () => {
    await assertValid("seo-title-meta", () => SeoTitleMetaAgent.instance.run(baseInput));
  });

  it("SeoContentGapAgent", async () => {
    await assertValid("seo-content-gap", () => SeoContentGapAgent.instance.run(baseInput));
  });

  it("SeoInternalLinkingAgent", async () => {
    await assertValid("seo-internal-linking", () => SeoInternalLinkingAgent.instance.run(baseInput));
  });

  it("SeoSchemaMarkupAgent", async () => {
    await assertValid("seo-schema-markup", () => SeoSchemaMarkupAgent.instance.run(baseInput));
  });

  it("SeoEEATBoosterAgent", async () => {
    await assertValid("seo-eeat-booster", () => SeoEEATBoosterAgent.instance.run(baseInput));
  });

  it("SeoSGEReadinessAgent", async () => {
    await assertValid("seo-sge-readiness", () => SeoSGEReadinessAgent.instance.run(baseInput));
  });
});
