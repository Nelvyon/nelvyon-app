// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getTourismBusinessProfileAgent,
  getTourismContentMarketingAgent,
  getTourismDirectBookingAgent,
  getTourismEmailCampaignAgent,
  getTourismListingOptimizationAgent,
  getTourismPackageDescriptionAgent,
  getTourismReviewManagementAgent,
  getTourismSEOAgent,
  getTourismSeasonalCampaignAgent,
  getTourismSocialMediaAgent,
  resetTourismBusinessProfileAgentForTests,
  resetTourismContentMarketingAgentForTests,
  resetTourismDirectBookingAgentForTests,
  resetTourismEmailCampaignAgentForTests,
  resetTourismListingOptimizationAgentForTests,
  resetTourismPackageDescriptionAgentForTests,
  resetTourismReviewManagementAgentForTests,
  resetTourismSEOAgentForTests,
  resetTourismSeasonalCampaignAgentForTests,
  resetTourismSocialMediaAgentForTests,
} from "../sectors/tourism";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Tourism agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetTourismBusinessProfileAgentForTests();
    resetTourismListingOptimizationAgentForTests();
    resetTourismContentMarketingAgentForTests();
    resetTourismSEOAgentForTests();
    resetTourismEmailCampaignAgentForTests();
    resetTourismSocialMediaAgentForTests();
    resetTourismReviewManagementAgentForTests();
    resetTourismDirectBookingAgentForTests();
    resetTourismPackageDescriptionAgentForTests();
    resetTourismSeasonalCampaignAgentForTests();
  });

  const input = { businessName: "Casas del Río", businessType: "apartamento-turístico", targetTraveler: "parejas", tone: "inspiracional", location: "Granada" };

  it("TourismBusinessProfileAgent", async () => {
    const r = await getTourismBusinessProfileAgent().run("u", input);
    expect(r.agentId).toBe("tourism-business-profile");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("TourismListingOptimizationAgent", async () => {
    const r = await getTourismListingOptimizationAgent().run("u", input);
    expect(r.agentId).toBe("tourism-listing-optimization");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("TourismContentMarketingAgent", async () => {
    const r = await getTourismContentMarketingAgent().run("u", input);
    expect(r.agentId).toBe("tourism-content-marketing");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("TourismSEOAgent", async () => {
    const r = await getTourismSEOAgent().run("u", input);
    expect(r.agentId).toBe("tourism-seo");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("TourismEmailCampaignAgent", async () => {
    const r = await getTourismEmailCampaignAgent().run("u", input);
    expect(r.agentId).toBe("tourism-email-campaign");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("TourismSocialMediaAgent", async () => {
    const r = await getTourismSocialMediaAgent().run("u", input);
    expect(r.agentId).toBe("tourism-social-media");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("TourismReviewManagementAgent", async () => {
    const r = await getTourismReviewManagementAgent().run("u", input);
    expect(r.agentId).toBe("tourism-review-management");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("TourismDirectBookingAgent", async () => {
    const r = await getTourismDirectBookingAgent().run("u", input);
    expect(r.agentId).toBe("tourism-direct-booking");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("TourismPackageDescriptionAgent", async () => {
    const r = await getTourismPackageDescriptionAgent().run("u", input);
    expect(r.agentId).toBe("tourism-package-description");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("TourismSeasonalCampaignAgent", async () => {
    const r = await getTourismSeasonalCampaignAgent().run("u", input);
    expect(r.agentId).toBe("tourism-seasonal-campaign");
    expect(r.result.length).toBeGreaterThan(0);
  });
});
