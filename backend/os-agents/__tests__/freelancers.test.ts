// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getClientProposalAgent,
  getFreelancerEmailSequenceAgent,
  getLinkedInOptimizationAgent,
  getNicheContentAgent,
  getPersonalBrandingAgent,
  getPortfolioDescriptionAgent,
  getRateJustificationAgent,
  getReferralSystemAgent,
  getTestimonialRequestAgent,
  resetClientProposalAgentForTests,
  resetFreelancerEmailSequenceAgentForTests,
  resetLinkedInOptimizationAgentForTests,
  resetNicheContentAgentForTests,
  resetPersonalBrandingAgentForTests,
  resetPortfolioDescriptionAgentForTests,
  resetRateJustificationAgentForTests,
  resetReferralSystemAgentForTests,
  resetTestimonialRequestAgentForTests,
} from "../sectors/freelancers";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(
      JSON.stringify({ choices: [{ message: { content: "test output" } }] }),
      { headers: { "Content-Type": "application/json" } },
    );
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Freelancers agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetPersonalBrandingAgentForTests();
    resetLinkedInOptimizationAgentForTests();
    resetPortfolioDescriptionAgentForTests();
    resetRateJustificationAgentForTests();
    resetClientProposalAgentForTests();
    resetTestimonialRequestAgentForTests();
    resetNicheContentAgentForTests();
    resetReferralSystemAgentForTests();
    resetFreelancerEmailSequenceAgentForTests();
  });

  const input = { professionalName: "Ana", specialty: "Consultoria", targetClient: "Pymes", tone: "profesional", location: "Madrid" };
  it("PersonalBrandingAgent", async () => { const r = await getPersonalBrandingAgent().run("u", input); expect(r.agentId).toBe("personal-branding"); expect(r.result.length).toBeGreaterThan(0); });
  it("LinkedInOptimizationAgent", async () => { const r = await getLinkedInOptimizationAgent().run("u", input); expect(r.agentId).toBe("linkedin-optimization"); expect(r.result.length).toBeGreaterThan(0); });
  it("PortfolioDescriptionAgent", async () => { const r = await getPortfolioDescriptionAgent().run("u", input); expect(r.agentId).toBe("portfolio-description"); expect(r.result.length).toBeGreaterThan(0); });
  it("RateJustificationAgent", async () => { const r = await getRateJustificationAgent().run("u", input); expect(r.agentId).toBe("rate-justification"); expect(r.result.length).toBeGreaterThan(0); });
  it("ClientProposalAgent", async () => { const r = await getClientProposalAgent().run("u", input); expect(r.agentId).toBe("client-proposal"); expect(r.result.length).toBeGreaterThan(0); });
  it("TestimonialRequestAgent", async () => { const r = await getTestimonialRequestAgent().run("u", input); expect(r.agentId).toBe("testimonial-request"); expect(r.result.length).toBeGreaterThan(0); });
  it("NicheContentAgent", async () => { const r = await getNicheContentAgent().run("u", input); expect(r.agentId).toBe("niche-content"); expect(r.result.length).toBeGreaterThan(0); });
  it("ReferralSystemAgent", async () => { const r = await getReferralSystemAgent().run("u", input); expect(r.agentId).toBe("referral-system"); expect(r.result.length).toBeGreaterThan(0); });
  it("FreelancerEmailSequenceAgent", async () => { const r = await getFreelancerEmailSequenceAgent().run("u", input); expect(r.agentId).toBe("freelancer-email-sequence"); expect(r.result.length).toBeGreaterThan(0); });
});

