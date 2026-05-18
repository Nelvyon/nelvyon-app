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
  SuperiorSeoAnalyticsAgent,
  SuperiorSeoBacklinkAgent,
  SuperiorSeoCompetitorAgent,
  SuperiorSeoContentAgent,
  SuperiorSeoKeywordAgent,
  SuperiorSeoLocalAgent,
  SuperiorSeoOnPageAgent,
  SuperiorSeoTechnicalAgent,
  resetAllSuperiorSeoAgentsForTests,
} from "../sectors/superiorseo";

const SS_JSON = JSON.stringify({
  content: "SuperiorSeo: top3 <90d, CTR>8%, CWV pass, 95% entities, daily rank reports.",
  score: 91,
  highlights: ["Top 3 <90d", ">8% CTR", "CWV"],
  metrics: ["Organic CTR"],
});

const superiorSeoInput = {
  userId: "00000000-0000-0000-0000-00000000ss01",
  sector: "saas",
  brand: "Dominio demo",
  seoBrief: "Keywords producto B2B",
  metricsBrief: "Posiciones GSC",
};

type SuperiorSeoOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorSeo agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SS_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorSeoAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorSeoOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorSeoKeywordAgent", async () => {
    await assertOutput("superiorseo-keyword", () => SuperiorSeoKeywordAgent.instance.run(superiorSeoInput));
  });

  it("SuperiorSeoOnPageAgent", async () => {
    await assertOutput("superiorseo-onpage", () => SuperiorSeoOnPageAgent.instance.run(superiorSeoInput));
  });

  it("SuperiorSeoTechnicalAgent", async () => {
    await assertOutput("superiorseo-technical", () => SuperiorSeoTechnicalAgent.instance.run(superiorSeoInput));
  });

  it("SuperiorSeoContentAgent", async () => {
    await assertOutput("superiorseo-content", () => SuperiorSeoContentAgent.instance.run(superiorSeoInput));
  });

  it("SuperiorSeoBacklinkAgent", async () => {
    await assertOutput("superiorseo-backlink", () => SuperiorSeoBacklinkAgent.instance.run(superiorSeoInput));
  });

  it("SuperiorSeoLocalAgent", async () => {
    await assertOutput("superiorseo-local", () => SuperiorSeoLocalAgent.instance.run(superiorSeoInput));
  });

  it("SuperiorSeoAnalyticsAgent", async () => {
    await assertOutput("superiorseo-analytics", () => SuperiorSeoAnalyticsAgent.instance.run(superiorSeoInput));
  });

  it("SuperiorSeoCompetitorAgent", async () => {
    await assertOutput("superiorseo-competitor", () => SuperiorSeoCompetitorAgent.instance.run(superiorSeoInput));
  });
});
