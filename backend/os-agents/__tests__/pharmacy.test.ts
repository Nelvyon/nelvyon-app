// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getPharmacyContentMarketingAgent,
  getPharmacyEmailCampaignAgent,
  getPharmacyLocalSEOAgent,
  getPharmacyLoyaltyProgramAgent,
  getPharmacyProfileAgent,
  getPharmacyReviewSystemAgent,
  getPharmacySeasonalCampaignAgent,
  getPharmacyWhatsAppStrategyAgent,
  resetPharmacyContentMarketingAgentForTests,
  resetPharmacyEmailCampaignAgentForTests,
  resetPharmacyLocalSEOAgentForTests,
  resetPharmacyLoyaltyProgramAgentForTests,
  resetPharmacyProfileAgentForTests,
  resetPharmacyReviewSystemAgentForTests,
  resetPharmacySeasonalCampaignAgentForTests,
  resetPharmacyWhatsAppStrategyAgentForTests,
} from "../sectors/pharmacy";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Pharmacy agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetPharmacyProfileAgentForTests();
    resetPharmacyContentMarketingAgentForTests();
    resetPharmacyLocalSEOAgentForTests();
    resetPharmacySeasonalCampaignAgentForTests();
    resetPharmacyEmailCampaignAgentForTests();
    resetPharmacyWhatsAppStrategyAgentForTests();
    resetPharmacyLoyaltyProgramAgentForTests();
    resetPharmacyReviewSystemAgentForTests();
  });

  const input = { businessName: "Farmacia Centro", businessType: "farmacia", targetClient: "familias", tone: "profesional", location: "Valencia" };
  it("PharmacyProfileAgent", async () => { const r = await getPharmacyProfileAgent().run("u", input); expect(r.agentId).toBe("pharmacy-profile"); expect(r.result.length).toBeGreaterThan(0); });
  it("PharmacyContentMarketingAgent", async () => { const r = await getPharmacyContentMarketingAgent().run("u", input); expect(r.agentId).toBe("pharmacy-content-marketing"); expect(r.result.length).toBeGreaterThan(0); });
  it("PharmacyLocalSEOAgent", async () => { const r = await getPharmacyLocalSEOAgent().run("u", input); expect(r.agentId).toBe("pharmacy-local-seo"); expect(r.result.length).toBeGreaterThan(0); });
  it("PharmacySeasonalCampaignAgent", async () => { const r = await getPharmacySeasonalCampaignAgent().run("u", input); expect(r.agentId).toBe("pharmacy-seasonal-campaign"); expect(r.result.length).toBeGreaterThan(0); });
  it("PharmacyEmailCampaignAgent", async () => { const r = await getPharmacyEmailCampaignAgent().run("u", input); expect(r.agentId).toBe("pharmacy-email-campaign"); expect(r.result.length).toBeGreaterThan(0); });
  it("PharmacyWhatsAppStrategyAgent", async () => { const r = await getPharmacyWhatsAppStrategyAgent().run("u", input); expect(r.agentId).toBe("pharmacy-whatsapp-strategy"); expect(r.result.length).toBeGreaterThan(0); });
  it("PharmacyLoyaltyProgramAgent", async () => { const r = await getPharmacyLoyaltyProgramAgent().run("u", input); expect(r.agentId).toBe("pharmacy-loyalty-program"); expect(r.result.length).toBeGreaterThan(0); });
  it("PharmacyReviewSystemAgent", async () => { const r = await getPharmacyReviewSystemAgent().run("u", input); expect(r.agentId).toBe("pharmacy-review-system"); expect(r.result.length).toBeGreaterThan(0); });
});
