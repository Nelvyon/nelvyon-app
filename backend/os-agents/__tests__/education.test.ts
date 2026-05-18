// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getEducationAdsAgent,
  getEducationCommunityAgent,
  getEducationContentMarketingAgent,
  getEducationCourseDescriptionAgent,
  getEducationEmailNurturingAgent,
  getEducationPartnershipAgent,
  getEducationRetentionAgent,
  getEducationSalesPageAgent,
  getEducationSEOAgent,
  getEducationStudentTestimonialAgent,
  getEducationUpsellAgent,
  getEducationWebinarScriptAgent,
  resetEducationAdsAgentForTests,
  resetEducationCommunityAgentForTests,
  resetEducationContentMarketingAgentForTests,
  resetEducationCourseDescriptionAgentForTests,
  resetEducationEmailNurturingAgentForTests,
  resetEducationPartnershipAgentForTests,
  resetEducationRetentionAgentForTests,
  resetEducationSalesPageAgentForTests,
  resetEducationSEOAgentForTests,
  resetEducationStudentTestimonialAgentForTests,
  resetEducationUpsellAgentForTests,
  resetEducationWebinarScriptAgentForTests,
} from "../sectors/education";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Education agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetEducationCourseDescriptionAgentForTests();
    resetEducationSalesPageAgentForTests();
    resetEducationEmailNurturingAgentForTests();
    resetEducationContentMarketingAgentForTests();
    resetEducationWebinarScriptAgentForTests();
    resetEducationStudentTestimonialAgentForTests();
    resetEducationSEOAgentForTests();
    resetEducationAdsAgentForTests();
    resetEducationCommunityAgentForTests();
    resetEducationPartnershipAgentForTests();
    resetEducationRetentionAgentForTests();
    resetEducationUpsellAgentForTests();
  });

  const input = { institutionName: "Nova Academy", educationType: "bootcamp", targetStudent: "junior devs", subjectArea: "tecnología", tone: "profesional", format: "híbrido" };
  it("EducationCourseDescriptionAgent", async () => { const r = await getEducationCourseDescriptionAgent().run("u", input); expect(r.agentId).toBe("education-course-description"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationSalesPageAgent", async () => { const r = await getEducationSalesPageAgent().run("u", input); expect(r.agentId).toBe("education-sales-page"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationEmailNurturingAgent", async () => { const r = await getEducationEmailNurturingAgent().run("u", input); expect(r.agentId).toBe("education-email-nurturing"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationContentMarketingAgent", async () => { const r = await getEducationContentMarketingAgent().run("u", input); expect(r.agentId).toBe("education-content-marketing"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationWebinarScriptAgent", async () => { const r = await getEducationWebinarScriptAgent().run("u", input); expect(r.agentId).toBe("education-webinar-script"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationStudentTestimonialAgent", async () => { const r = await getEducationStudentTestimonialAgent().run("u", input); expect(r.agentId).toBe("education-student-testimonial"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationSEOAgent", async () => { const r = await getEducationSEOAgent().run("u", input); expect(r.agentId).toBe("education-seo"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationAdsAgent", async () => { const r = await getEducationAdsAgent().run("u", input); expect(r.agentId).toBe("education-ads"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationCommunityAgent", async () => { const r = await getEducationCommunityAgent().run("u", input); expect(r.agentId).toBe("education-community"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationPartnershipAgent", async () => { const r = await getEducationPartnershipAgent().run("u", input); expect(r.agentId).toBe("education-partnership"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationRetentionAgent", async () => { const r = await getEducationRetentionAgent().run("u", input); expect(r.agentId).toBe("education-retention"); expect(r.result.length).toBeGreaterThan(0); });
  it("EducationUpsellAgent", async () => { const r = await getEducationUpsellAgent().run("u", input); expect(r.agentId).toBe("education-upsell"); expect(r.result.length).toBeGreaterThan(0); });
});

