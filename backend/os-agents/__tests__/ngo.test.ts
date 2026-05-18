// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getNgoCorporatePartnershipAgent,
  getNgoDonationCampaignAgent,
  getNgoEmailCampaignAgent,
  getNgoGrantWritingAgent,
  getNgoOrganizationProfileAgent,
  getNgoSocialMediaAgent,
  getNgoTransparencyReportAgent,
  getNgoVolunteerRecruitmentAgent,
  resetNgoCorporatePartnershipAgentForTests,
  resetNgoDonationCampaignAgentForTests,
  resetNgoEmailCampaignAgentForTests,
  resetNgoGrantWritingAgentForTests,
  resetNgoOrganizationProfileAgentForTests,
  resetNgoSocialMediaAgentForTests,
  resetNgoTransparencyReportAgentForTests,
  resetNgoVolunteerRecruitmentAgentForTests,
} from "../sectors/ngo";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Ngo agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetNgoOrganizationProfileAgentForTests();
    resetNgoDonationCampaignAgentForTests();
    resetNgoSocialMediaAgentForTests();
    resetNgoVolunteerRecruitmentAgentForTests();
    resetNgoGrantWritingAgentForTests();
    resetNgoCorporatePartnershipAgentForTests();
    resetNgoEmailCampaignAgentForTests();
    resetNgoTransparencyReportAgentForTests();
  });

  const input = { organizationName: "Ayuda Norte", cause: "infancia", targetAudience: "donantes recurrentes", tone: "cercano", country: "ES" };
  it("NgoOrganizationProfileAgent", async () => { const r = await getNgoOrganizationProfileAgent().run("u", input); expect(r.agentId).toBe("ngo-organization-profile"); expect(r.result.length).toBeGreaterThan(0); });
  it("NgoDonationCampaignAgent", async () => { const r = await getNgoDonationCampaignAgent().run("u", input); expect(r.agentId).toBe("ngo-donation-campaign"); expect(r.result.length).toBeGreaterThan(0); });
  it("NgoSocialMediaAgent", async () => { const r = await getNgoSocialMediaAgent().run("u", input); expect(r.agentId).toBe("ngo-social-media"); expect(r.result.length).toBeGreaterThan(0); });
  it("NgoVolunteerRecruitmentAgent", async () => { const r = await getNgoVolunteerRecruitmentAgent().run("u", input); expect(r.agentId).toBe("ngo-volunteer-recruitment"); expect(r.result.length).toBeGreaterThan(0); });
  it("NgoGrantWritingAgent", async () => { const r = await getNgoGrantWritingAgent().run("u", input); expect(r.agentId).toBe("ngo-grant-writing"); expect(r.result.length).toBeGreaterThan(0); });
  it("NgoCorporatePartnershipAgent", async () => { const r = await getNgoCorporatePartnershipAgent().run("u", input); expect(r.agentId).toBe("ngo-corporate-partnership"); expect(r.result.length).toBeGreaterThan(0); });
  it("NgoEmailCampaignAgent", async () => { const r = await getNgoEmailCampaignAgent().run("u", input); expect(r.agentId).toBe("ngo-email-campaign"); expect(r.result.length).toBeGreaterThan(0); });
  it("NgoTransparencyReportAgent", async () => { const r = await getNgoTransparencyReportAgent().run("u", input); expect(r.agentId).toBe("ngo-transparency-report"); expect(r.result.length).toBeGreaterThan(0); });
});
