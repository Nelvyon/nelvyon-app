// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getHomeBeforeAfterContentAgent,
  getHomeBudgetEmailAgent,
  getHomeBusinessProfileAgent,
  getHomeClientRetentionAgent,
  getHomeLeadGenerationAgent,
  getHomeLocalSEOAgent,
  getHomeReviewSystemAgent,
  getHomeSeasonalCampaignAgent,
  getHomeUrgencyAdsAgent,
  resetHomeBeforeAfterContentAgentForTests,
  resetHomeBudgetEmailAgentForTests,
  resetHomeBusinessProfileAgentForTests,
  resetHomeClientRetentionAgentForTests,
  resetHomeLeadGenerationAgentForTests,
  resetHomeLocalSEOAgentForTests,
  resetHomeReviewSystemAgentForTests,
  resetHomeSeasonalCampaignAgentForTests,
  resetHomeUrgencyAdsAgentForTests,
} from "../sectors/home";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Home agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetHomeBusinessProfileAgentForTests();
    resetHomeLocalSEOAgentForTests();
    resetHomeLeadGenerationAgentForTests();
    resetHomeReviewSystemAgentForTests();
    resetHomeBeforeAfterContentAgentForTests();
    resetHomeUrgencyAdsAgentForTests();
    resetHomeClientRetentionAgentForTests();
    resetHomeBudgetEmailAgentForTests();
    resetHomeSeasonalCampaignAgentForTests();
  });

  const input = { businessName: "Hogar Pro", serviceType: "fontanería", targetArea: "Madrid sur", tone: "profesional", urgency: "24h" };
  it("HomeBusinessProfileAgent", async () => { const r = await getHomeBusinessProfileAgent().run("u", input); expect(r.agentId).toBe("home-business-profile"); expect(r.result.length).toBeGreaterThan(0); });
  it("HomeLocalSEOAgent", async () => { const r = await getHomeLocalSEOAgent().run("u", input); expect(r.agentId).toBe("home-local-seo"); expect(r.result.length).toBeGreaterThan(0); });
  it("HomeLeadGenerationAgent", async () => { const r = await getHomeLeadGenerationAgent().run("u", input); expect(r.agentId).toBe("home-lead-generation"); expect(r.result.length).toBeGreaterThan(0); });
  it("HomeReviewSystemAgent", async () => { const r = await getHomeReviewSystemAgent().run("u", input); expect(r.agentId).toBe("home-review-system"); expect(r.result.length).toBeGreaterThan(0); });
  it("HomeBeforeAfterContentAgent", async () => { const r = await getHomeBeforeAfterContentAgent().run("u", input); expect(r.agentId).toBe("home-before-after-content"); expect(r.result.length).toBeGreaterThan(0); });
  it("HomeUrgencyAdsAgent", async () => { const r = await getHomeUrgencyAdsAgent().run("u", input); expect(r.agentId).toBe("home-urgency-ads"); expect(r.result.length).toBeGreaterThan(0); });
  it("HomeClientRetentionAgent", async () => { const r = await getHomeClientRetentionAgent().run("u", input); expect(r.agentId).toBe("home-client-retention"); expect(r.result.length).toBeGreaterThan(0); });
  it("HomeBudgetEmailAgent", async () => { const r = await getHomeBudgetEmailAgent().run("u", input); expect(r.agentId).toBe("home-budget-email"); expect(r.result.length).toBeGreaterThan(0); });
  it("HomeSeasonalCampaignAgent", async () => { const r = await getHomeSeasonalCampaignAgent().run("u", input); expect(r.agentId).toBe("home-seasonal-campaign"); expect(r.result.length).toBeGreaterThan(0); });
});
