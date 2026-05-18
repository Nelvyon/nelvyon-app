// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getVetAppointmentNurturingAgent,
  getVetClinicProfileAgent,
  getVetContentMarketingAgent,
  getVetLocalSEOAgent,
  getVetLoyaltyProgramAgent,
  getVetPetShopContentAgent,
  getVetReviewSystemAgent,
  getVetSeasonalCampaignAgent,
  resetVetAppointmentNurturingAgentForTests,
  resetVetClinicProfileAgentForTests,
  resetVetContentMarketingAgentForTests,
  resetVetLocalSEOAgentForTests,
  resetVetLoyaltyProgramAgentForTests,
  resetVetPetShopContentAgentForTests,
  resetVetReviewSystemAgentForTests,
  resetVetSeasonalCampaignAgentForTests,
} from "../sectors/veterinary";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Veterinary agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetVetClinicProfileAgentForTests();
    resetVetContentMarketingAgentForTests();
    resetVetLocalSEOAgentForTests();
    resetVetAppointmentNurturingAgentForTests();
    resetVetSeasonalCampaignAgentForTests();
    resetVetReviewSystemAgentForTests();
    resetVetLoyaltyProgramAgentForTests();
    resetVetPetShopContentAgentForTests();
  });

  const input = { businessName: "Huellas Sur", serviceType: "clínica-veterinaria", targetPet: "perros", tone: "empático", location: "Málaga" };
  it("VetClinicProfileAgent", async () => { const r = await getVetClinicProfileAgent().run("u", input); expect(r.agentId).toBe("vet-clinic-profile"); expect(r.result.length).toBeGreaterThan(0); });
  it("VetContentMarketingAgent", async () => { const r = await getVetContentMarketingAgent().run("u", input); expect(r.agentId).toBe("vet-content-marketing"); expect(r.result.length).toBeGreaterThan(0); });
  it("VetLocalSEOAgent", async () => { const r = await getVetLocalSEOAgent().run("u", input); expect(r.agentId).toBe("vet-local-seo"); expect(r.result.length).toBeGreaterThan(0); });
  it("VetAppointmentNurturingAgent", async () => { const r = await getVetAppointmentNurturingAgent().run("u", input); expect(r.agentId).toBe("vet-appointment-nurturing"); expect(r.result.length).toBeGreaterThan(0); });
  it("VetSeasonalCampaignAgent", async () => { const r = await getVetSeasonalCampaignAgent().run("u", input); expect(r.agentId).toBe("vet-seasonal-campaign"); expect(r.result.length).toBeGreaterThan(0); });
  it("VetReviewSystemAgent", async () => { const r = await getVetReviewSystemAgent().run("u", input); expect(r.agentId).toBe("vet-review-system"); expect(r.result.length).toBeGreaterThan(0); });
  it("VetLoyaltyProgramAgent", async () => { const r = await getVetLoyaltyProgramAgent().run("u", input); expect(r.agentId).toBe("vet-loyalty-program"); expect(r.result.length).toBeGreaterThan(0); });
  it("VetPetShopContentAgent", async () => { const r = await getVetPetShopContentAgent().run("u", input); expect(r.agentId).toBe("vet-pet-shop-content"); expect(r.result.length).toBeGreaterThan(0); });
});
