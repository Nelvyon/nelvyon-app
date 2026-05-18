// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getAutoAdsAgent,
  getAutoBusinessProfileAgent,
  getAutoContentStrategyAgent,
  getAutoEmailCampaignAgent,
  getAutoLocalSEOAgent,
  getAutoReferralAgent,
  getAutoReviewSystemAgent,
  getAutoSeasonalCampaignAgent,
  getAutoVehicleDescriptionAgent,
  resetAutoAdsAgentForTests,
  resetAutoBusinessProfileAgentForTests,
  resetAutoContentStrategyAgentForTests,
  resetAutoEmailCampaignAgentForTests,
  resetAutoLocalSEOAgentForTests,
  resetAutoReferralAgentForTests,
  resetAutoReviewSystemAgentForTests,
  resetAutoSeasonalCampaignAgentForTests,
  resetAutoVehicleDescriptionAgentForTests,
} from "../sectors/automotive";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Automotive agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetAutoBusinessProfileAgentForTests();
    resetAutoVehicleDescriptionAgentForTests();
    resetAutoLocalSEOAgentForTests();
    resetAutoAdsAgentForTests();
    resetAutoEmailCampaignAgentForTests();
    resetAutoReviewSystemAgentForTests();
    resetAutoContentStrategyAgentForTests();
    resetAutoReferralAgentForTests();
    resetAutoSeasonalCampaignAgentForTests();
  });

  const input = { businessName: "Motor Sur", businessType: "taller", targetClient: "particulares", tone: "profesional", location: "Sevilla" };
  it("AutoBusinessProfileAgent", async () => { const r = await getAutoBusinessProfileAgent().run("u", input); expect(r.agentId).toBe("auto-business-profile"); expect(r.result.length).toBeGreaterThan(0); });
  it("AutoVehicleDescriptionAgent", async () => { const r = await getAutoVehicleDescriptionAgent().run("u", input); expect(r.agentId).toBe("auto-vehicle-description"); expect(r.result.length).toBeGreaterThan(0); });
  it("AutoLocalSEOAgent", async () => { const r = await getAutoLocalSEOAgent().run("u", input); expect(r.agentId).toBe("auto-local-seo"); expect(r.result.length).toBeGreaterThan(0); });
  it("AutoAdsAgent", async () => { const r = await getAutoAdsAgent().run("u", input); expect(r.agentId).toBe("auto-ads"); expect(r.result.length).toBeGreaterThan(0); });
  it("AutoEmailCampaignAgent", async () => { const r = await getAutoEmailCampaignAgent().run("u", input); expect(r.agentId).toBe("auto-email-campaign"); expect(r.result.length).toBeGreaterThan(0); });
  it("AutoReviewSystemAgent", async () => { const r = await getAutoReviewSystemAgent().run("u", input); expect(r.agentId).toBe("auto-review-system"); expect(r.result.length).toBeGreaterThan(0); });
  it("AutoContentStrategyAgent", async () => { const r = await getAutoContentStrategyAgent().run("u", input); expect(r.agentId).toBe("auto-content-strategy"); expect(r.result.length).toBeGreaterThan(0); });
  it("AutoReferralAgent", async () => { const r = await getAutoReferralAgent().run("u", input); expect(r.agentId).toBe("auto-referral"); expect(r.result.length).toBeGreaterThan(0); });
  it("AutoSeasonalCampaignAgent", async () => { const r = await getAutoSeasonalCampaignAgent().run("u", input); expect(r.agentId).toBe("auto-seasonal-campaign"); expect(r.result.length).toBeGreaterThan(0); });
});
