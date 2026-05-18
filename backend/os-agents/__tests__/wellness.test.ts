// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getWellnessAdsAgent,
  getWellnessBusinessProfileAgent,
  getWellnessContentMarketingAgent,
  getWellnessCorporateWellnessAgent,
  getWellnessLeadGenerationAgent,
  getWellnessMembershipEmailAgent,
  getWellnessPersonalTrainingAgent,
  getWellnessRetentionAgent,
  getWellnessReviewSystemAgent,
  getWellnessSocialMediaAgent,
  resetWellnessAdsAgentForTests,
  resetWellnessBusinessProfileAgentForTests,
  resetWellnessContentMarketingAgentForTests,
  resetWellnessCorporateWellnessAgentForTests,
  resetWellnessLeadGenerationAgentForTests,
  resetWellnessMembershipEmailAgentForTests,
  resetWellnessPersonalTrainingAgentForTests,
  resetWellnessRetentionAgentForTests,
  resetWellnessReviewSystemAgentForTests,
  resetWellnessSocialMediaAgentForTests,
} from "../sectors/wellness";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Wellness agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetWellnessBusinessProfileAgentForTests();
    resetWellnessSocialMediaAgentForTests();
    resetWellnessMembershipEmailAgentForTests();
    resetWellnessLeadGenerationAgentForTests();
    resetWellnessContentMarketingAgentForTests();
    resetWellnessRetentionAgentForTests();
    resetWellnessPersonalTrainingAgentForTests();
    resetWellnessAdsAgentForTests();
    resetWellnessCorporateWellnessAgentForTests();
    resetWellnessReviewSystemAgentForTests();
  });

  const input = { businessName: "ZenFit", serviceType: "yoga-pilates", targetClient: "urban professionals", tone: "inspiracional", specialization: "bienestar-mental" };
  it("WellnessBusinessProfileAgent", async () => { const r = await getWellnessBusinessProfileAgent().run("u", input); expect(r.agentId).toBe("wellness-business-profile"); expect(r.result.length).toBeGreaterThan(0); });
  it("WellnessSocialMediaAgent", async () => { const r = await getWellnessSocialMediaAgent().run("u", input); expect(r.agentId).toBe("wellness-social-media"); expect(r.result.length).toBeGreaterThan(0); });
  it("WellnessMembershipEmailAgent", async () => { const r = await getWellnessMembershipEmailAgent().run("u", input); expect(r.agentId).toBe("wellness-membership-email"); expect(r.result.length).toBeGreaterThan(0); });
  it("WellnessLeadGenerationAgent", async () => { const r = await getWellnessLeadGenerationAgent().run("u", input); expect(r.agentId).toBe("wellness-lead-generation"); expect(r.result.length).toBeGreaterThan(0); });
  it("WellnessContentMarketingAgent", async () => { const r = await getWellnessContentMarketingAgent().run("u", input); expect(r.agentId).toBe("wellness-content-marketing"); expect(r.result.length).toBeGreaterThan(0); });
  it("WellnessRetentionAgent", async () => { const r = await getWellnessRetentionAgent().run("u", input); expect(r.agentId).toBe("wellness-retention"); expect(r.result.length).toBeGreaterThan(0); });
  it("WellnessPersonalTrainingAgent", async () => { const r = await getWellnessPersonalTrainingAgent().run("u", input); expect(r.agentId).toBe("wellness-personal-training"); expect(r.result.length).toBeGreaterThan(0); });
  it("WellnessAdsAgent", async () => { const r = await getWellnessAdsAgent().run("u", input); expect(r.agentId).toBe("wellness-ads"); expect(r.result.length).toBeGreaterThan(0); });
  it("WellnessCorporateWellnessAgent", async () => { const r = await getWellnessCorporateWellnessAgent().run("u", input); expect(r.agentId).toBe("wellness-corporate-wellness"); expect(r.result.length).toBeGreaterThan(0); });
  it("WellnessReviewSystemAgent", async () => { const r = await getWellnessReviewSystemAgent().run("u", input); expect(r.agentId).toBe("wellness-review-system"); expect(r.result.length).toBeGreaterThan(0); });
});
