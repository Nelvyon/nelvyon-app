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
  SuperiorInfluencerAuditAgent,
  SuperiorInfluencerCampaignAgent,
  SuperiorInfluencerDiscoveryAgent,
  SuperiorInfluencerNegotiationAgent,
  SuperiorInfluencerOutreachAgent,
  SuperiorInfluencerRelationshipAgent,
  SuperiorInfluencerROIAgent,
  SuperiorInfluencerTrackingAgent,
  resetAllSuperiorInfluencerAgentsForTests,
} from "../sectors/superiorinfluencer";

const SI_JSON = JSON.stringify({
  content: "SuperiorInfluencer: fake>95%, ROI>300%, outreach>25%, brief<2m, enriched DB.",
  score: 91,
  highlights: ["Fake detect", "ROI 300%", "Outreach 25%"],
  metrics: ["Campaign ROI"],
});

const superiorInfluencerInput = {
  userId: "00000000-0000-0000-0000-00000000if01",
  sector: "beauty",
  brand: "Marca beauty",
  influencerBrief: "Micro TikTok beauty ES",
  metricsBrief: "ROI CPE CPA",
};

type SuperiorInfluencerOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("SuperiorInfluencer agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SI_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllSuperiorInfluencerAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as SuperiorInfluencerOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("SuperiorInfluencerDiscoveryAgent", async () => {
    await assertOutput("superiorinfluencer-discovery", () =>
      SuperiorInfluencerDiscoveryAgent.instance.run(superiorInfluencerInput),
    );
  });

  it("SuperiorInfluencerAuditAgent", async () => {
    await assertOutput("superiorinfluencer-audit", () => SuperiorInfluencerAuditAgent.instance.run(superiorInfluencerInput));
  });

  it("SuperiorInfluencerOutreachAgent", async () => {
    await assertOutput("superiorinfluencer-outreach", () => SuperiorInfluencerOutreachAgent.instance.run(superiorInfluencerInput));
  });

  it("SuperiorInfluencerNegotiationAgent", async () => {
    await assertOutput("superiorinfluencer-negotiation", () =>
      SuperiorInfluencerNegotiationAgent.instance.run(superiorInfluencerInput),
    );
  });

  it("SuperiorInfluencerCampaignAgent", async () => {
    await assertOutput("superiorinfluencer-campaign", () => SuperiorInfluencerCampaignAgent.instance.run(superiorInfluencerInput));
  });

  it("SuperiorInfluencerTrackingAgent", async () => {
    await assertOutput("superiorinfluencer-tracking", () => SuperiorInfluencerTrackingAgent.instance.run(superiorInfluencerInput));
  });

  it("SuperiorInfluencerROIAgent", async () => {
    await assertOutput("superiorinfluencer-roi", () => SuperiorInfluencerROIAgent.instance.run(superiorInfluencerInput));
  });

  it("SuperiorInfluencerRelationshipAgent", async () => {
    await assertOutput("superiorinfluencer-relationship", () =>
      SuperiorInfluencerRelationshipAgent.instance.run(superiorInfluencerInput),
    );
  });
});
