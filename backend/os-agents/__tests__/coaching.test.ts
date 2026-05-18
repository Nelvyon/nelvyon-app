// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getCoachingAdsAgent,
  getCoachingCommunityAgent,
  getCoachingContentStrategyAgent,
  getCoachingLeadMagnetAgent,
  getCoachingLaunchEmailAgent,
  getCoachingPersonalBrandAgent,
  getCoachingSalesPageAgent,
  getCoachingTestimonialSystemAgent,
  getCoachingUpsellFunnelAgent,
  getCoachingWebinarAgent,
  resetCoachingAdsAgentForTests,
  resetCoachingCommunityAgentForTests,
  resetCoachingContentStrategyAgentForTests,
  resetCoachingLeadMagnetAgentForTests,
  resetCoachingLaunchEmailAgentForTests,
  resetCoachingPersonalBrandAgentForTests,
  resetCoachingSalesPageAgentForTests,
  resetCoachingTestimonialSystemAgentForTests,
  resetCoachingUpsellFunnelAgentForTests,
  resetCoachingWebinarAgentForTests,
} from "../sectors/coaching";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Coaching agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetCoachingPersonalBrandAgentForTests();
    resetCoachingLaunchEmailAgentForTests();
    resetCoachingSalesPageAgentForTests();
    resetCoachingWebinarAgentForTests();
    resetCoachingContentStrategyAgentForTests();
    resetCoachingLeadMagnetAgentForTests();
    resetCoachingTestimonialSystemAgentForTests();
    resetCoachingAdsAgentForTests();
    resetCoachingCommunityAgentForTests();
    resetCoachingUpsellFunnelAgentForTests();
  });

  const input = { expertName: "Alex Coach", niche: "productividad", targetAudience: "emprendedoras", tone: "directo", productType: "programa-grupal" };
  it("CoachingPersonalBrandAgent", async () => { const r = await getCoachingPersonalBrandAgent().run("u", input); expect(r.agentId).toBe("coaching-personal-brand"); expect(r.result.length).toBeGreaterThan(0); });
  it("CoachingLaunchEmailAgent", async () => { const r = await getCoachingLaunchEmailAgent().run("u", input); expect(r.agentId).toBe("coaching-launch-email"); expect(r.result.length).toBeGreaterThan(0); });
  it("CoachingSalesPageAgent", async () => { const r = await getCoachingSalesPageAgent().run("u", input); expect(r.agentId).toBe("coaching-sales-page"); expect(r.result.length).toBeGreaterThan(0); });
  it("CoachingWebinarAgent", async () => { const r = await getCoachingWebinarAgent().run("u", input); expect(r.agentId).toBe("coaching-webinar"); expect(r.result.length).toBeGreaterThan(0); });
  it("CoachingContentStrategyAgent", async () => { const r = await getCoachingContentStrategyAgent().run("u", input); expect(r.agentId).toBe("coaching-content-strategy"); expect(r.result.length).toBeGreaterThan(0); });
  it("CoachingLeadMagnetAgent", async () => { const r = await getCoachingLeadMagnetAgent().run("u", input); expect(r.agentId).toBe("coaching-lead-magnet"); expect(r.result.length).toBeGreaterThan(0); });
  it("CoachingTestimonialSystemAgent", async () => { const r = await getCoachingTestimonialSystemAgent().run("u", input); expect(r.agentId).toBe("coaching-testimonial-system"); expect(r.result.length).toBeGreaterThan(0); });
  it("CoachingAdsAgent", async () => { const r = await getCoachingAdsAgent().run("u", input); expect(r.agentId).toBe("coaching-ads"); expect(r.result.length).toBeGreaterThan(0); });
  it("CoachingCommunityAgent", async () => { const r = await getCoachingCommunityAgent().run("u", input); expect(r.agentId).toBe("coaching-community"); expect(r.result.length).toBeGreaterThan(0); });
  it("CoachingUpsellFunnelAgent", async () => { const r = await getCoachingUpsellFunnelAgent().run("u", input); expect(r.agentId).toBe("coaching-upsell-funnel"); expect(r.result.length).toBeGreaterThan(0); });
});
