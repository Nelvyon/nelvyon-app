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
  SuperiorLeadEnrichmentCompanyAgent,
  SuperiorLeadEnrichmentIntentAgent,
  SuperiorLeadEnrichmentProfileAgent,
  SuperiorLeadEnrichmentRoutingAgent,
  SuperiorLeadEnrichmentScoringAgent,
  SuperiorLeadEnrichmentSegmentAgent,
  SuperiorLeadEnrichmentSocialAgent,
  SuperiorLeadEnrichmentVerificationAgent,
  resetAllSuperiorLeadEnrichmentAgentsForTests,
} from "../sectors/superiorleadenrichment";

const LE_JSON = JSON.stringify({
  content: "SuperiorLeadEnrichment: <3s enrich, >85% fields, >98% email verify, >90% ICP, auto routing, <24h freshness.",
  score: 91,
  highlights: ["<3s enrichment", ">85% coverage", ">98% verification"],
  metrics: ["ICP scoring accuracy"],
});

const superiorLeadEnrichmentInput = {
  userId: "00000000-0000-0000-0000-00000000le01",
  sector: "b2b",
  brand: "B2B demo",
  leadBrief: "VP Sales · SaaS mid-market",
  metricsBrief: "ICP fit · verification rate",
};

type SuperiorLeadEnrichmentOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorLeadEnrichment agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(LE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorLeadEnrichmentAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorLeadEnrichmentOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorLeadEnrichmentProfileAgent", async () => {
    await assertOutput("superiorleadenrichment-profile", () =>
      SuperiorLeadEnrichmentProfileAgent.instance.run(superiorLeadEnrichmentInput),
    );
  });

  it("SuperiorLeadEnrichmentCompanyAgent", async () => {
    await assertOutput("superiorleadenrichment-company", () =>
      SuperiorLeadEnrichmentCompanyAgent.instance.run(superiorLeadEnrichmentInput),
    );
  });

  it("SuperiorLeadEnrichmentIntentAgent", async () => {
    await assertOutput("superiorleadenrichment-intent", () =>
      SuperiorLeadEnrichmentIntentAgent.instance.run(superiorLeadEnrichmentInput),
    );
  });

  it("SuperiorLeadEnrichmentScoringAgent", async () => {
    await assertOutput("superiorleadenrichment-scoring", () =>
      SuperiorLeadEnrichmentScoringAgent.instance.run(superiorLeadEnrichmentInput),
    );
  });

  it("SuperiorLeadEnrichmentSegmentAgent", async () => {
    await assertOutput("superiorleadenrichment-segment", () =>
      SuperiorLeadEnrichmentSegmentAgent.instance.run(superiorLeadEnrichmentInput),
    );
  });

  it("SuperiorLeadEnrichmentVerificationAgent", async () => {
    await assertOutput("superiorleadenrichment-verification", () =>
      SuperiorLeadEnrichmentVerificationAgent.instance.run(superiorLeadEnrichmentInput),
    );
  });

  it("SuperiorLeadEnrichmentSocialAgent", async () => {
    await assertOutput("superiorleadenrichment-social", () =>
      SuperiorLeadEnrichmentSocialAgent.instance.run(superiorLeadEnrichmentInput),
    );
  });

  it("SuperiorLeadEnrichmentRoutingAgent", async () => {
    await assertOutput("superiorleadenrichment-routing", () =>
      SuperiorLeadEnrichmentRoutingAgent.instance.run(superiorLeadEnrichmentInput),
    );
  });
});
