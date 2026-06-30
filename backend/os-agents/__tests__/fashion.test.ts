// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getFashionBrandStoryAgent,
  getFashionEmailCampaignAgent,
  getFashionInfluencerBriefAgent,
  getFashionInstagramAgent,
  getFashionLookbookCopyAgent,
  getFashionProductDescriptionAgent,
  getFashionRetentionAgent,
  getFashionSeasonalCampaignAgent,
  getFashionSEOAgent,
  getFashionUGCStrategyAgent,
  resetFashionBrandStoryAgentForTests,
  resetFashionEmailCampaignAgentForTests,
  resetFashionInfluencerBriefAgentForTests,
  resetFashionInstagramAgentForTests,
  resetFashionLookbookCopyAgentForTests,
  resetFashionProductDescriptionAgentForTests,
  resetFashionRetentionAgentForTests,
  resetFashionSeasonalCampaignAgentForTests,
  resetFashionSEOAgentForTests,
  resetFashionUGCStrategyAgentForTests,
} from "../sectors/fashion";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Fashion agents", { timeout: 15_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetFashionBrandStoryAgentForTests();
    resetFashionProductDescriptionAgentForTests();
    resetFashionInstagramAgentForTests();
    resetFashionInfluencerBriefAgentForTests();
    resetFashionEmailCampaignAgentForTests();
    resetFashionLookbookCopyAgentForTests();
    resetFashionSEOAgentForTests();
    resetFashionUGCStrategyAgentForTests();
    resetFashionSeasonalCampaignAgentForTests();
    resetFashionRetentionAgentForTests();
  });

  const input = { brandName: "Luna", category: "belleza", targetAudience: "20-35", priceRange: "premium", tone: "editorial", season: "SS25" };
  it("FashionBrandStoryAgent", async () => { const r = await getFashionBrandStoryAgent().run("u", input); expect(r.agentId).toBe("fashion-brand-story"); expect(r.result.length).toBeGreaterThan(0); });
  it("FashionProductDescriptionAgent", async () => { const r = await getFashionProductDescriptionAgent().run("u", input); expect(r.agentId).toBe("fashion-product-description"); expect(r.result.length).toBeGreaterThan(0); });
  it("FashionInstagramAgent", async () => { const r = await getFashionInstagramAgent().run("u", input); expect(r.agentId).toBe("fashion-instagram"); expect(r.result.length).toBeGreaterThan(0); });
  it("FashionInfluencerBriefAgent", async () => { const r = await getFashionInfluencerBriefAgent().run("u", input); expect(r.agentId).toBe("fashion-influencer-brief"); expect(r.result.length).toBeGreaterThan(0); });
  it("FashionEmailCampaignAgent", async () => { const r = await getFashionEmailCampaignAgent().run("u", input); expect(r.agentId).toBe("fashion-email-campaign"); expect(r.result.length).toBeGreaterThan(0); });
  it("FashionLookbookCopyAgent", async () => { const r = await getFashionLookbookCopyAgent().run("u", input); expect(r.agentId).toBe("fashion-lookbook-copy"); expect(r.result.length).toBeGreaterThan(0); });
  it("FashionSEOAgent", async () => { const r = await getFashionSEOAgent().run("u", input); expect(r.agentId).toBe("fashion-seo"); expect(r.result.length).toBeGreaterThan(0); });
  it("FashionUGCStrategyAgent", async () => { const r = await getFashionUGCStrategyAgent().run("u", input); expect(r.agentId).toBe("fashion-ugc-strategy"); expect(r.result.length).toBeGreaterThan(0); });
  it("FashionSeasonalCampaignAgent", async () => { const r = await getFashionSeasonalCampaignAgent().run("u", input); expect(r.agentId).toBe("fashion-seasonal-campaign"); expect(r.result.length).toBeGreaterThan(0); });
  it("FashionRetentionAgent", async () => { const r = await getFashionRetentionAgent().run("u", input); expect(r.agentId).toBe("fashion-retention"); expect(r.result.length).toBeGreaterThan(0); });
});

