// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getCompetitivePositioningAgent,
  getDeveloperCommunityAgent,
  getElevatorPitchAgent,
  getGrowthHackingAgent,
  getInvestorDeckNarrativeAgent,
  getJobDescriptionTechAgent,
  getOnboardingEmailSequenceAgent,
  getPRAndMediaAgent,
  getProductHuntLaunchAgent,
  getStartupSocialMediaAgent,
  getTechBlogContentAgent,
  resetCompetitivePositioningAgentForTests,
  resetDeveloperCommunityAgentForTests,
  resetElevatorPitchAgentForTests,
  resetGrowthHackingAgentForTests,
  resetInvestorDeckNarrativeAgentForTests,
  resetJobDescriptionTechAgentForTests,
  resetOnboardingEmailSequenceAgentForTests,
  resetPRAndMediaAgentForTests,
  resetProductHuntLaunchAgentForTests,
  resetStartupSocialMediaAgentForTests,
  resetTechBlogContentAgentForTests,
} from "../sectors/startups";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Startups agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetElevatorPitchAgentForTests();
    resetInvestorDeckNarrativeAgentForTests();
    resetProductHuntLaunchAgentForTests();
    resetTechBlogContentAgentForTests();
    resetDeveloperCommunityAgentForTests();
    resetCompetitivePositioningAgentForTests();
    resetGrowthHackingAgentForTests();
    resetJobDescriptionTechAgentForTests();
    resetPRAndMediaAgentForTests();
    resetOnboardingEmailSequenceAgentForTests();
    resetStartupSocialMediaAgentForTests();
  });

  const input = { startupName: "Nova", productDescription: "AI workflow", targetMarket: "SMB SaaS", stage: "seed", tone: "directo" };
  it("ElevatorPitchAgent", async () => { const r = await getElevatorPitchAgent().run("u", input); expect(r.agentId).toBe("elevator-pitch"); expect(r.result.length).toBeGreaterThan(0); });
  it("InvestorDeckNarrativeAgent", async () => { const r = await getInvestorDeckNarrativeAgent().run("u", input); expect(r.agentId).toBe("investor-deck-narrative"); expect(r.result.length).toBeGreaterThan(0); });
  it("ProductHuntLaunchAgent", async () => { const r = await getProductHuntLaunchAgent().run("u", input); expect(r.agentId).toBe("product-hunt-launch"); expect(r.result.length).toBeGreaterThan(0); });
  it("TechBlogContentAgent", async () => { const r = await getTechBlogContentAgent().run("u", input); expect(r.agentId).toBe("tech-blog-content"); expect(r.result.length).toBeGreaterThan(0); });
  it("DeveloperCommunityAgent", async () => { const r = await getDeveloperCommunityAgent().run("u", input); expect(r.agentId).toBe("developer-community"); expect(r.result.length).toBeGreaterThan(0); });
  it("CompetitivePositioningAgent", async () => { const r = await getCompetitivePositioningAgent().run("u", input); expect(r.agentId).toBe("competitive-positioning"); expect(r.result.length).toBeGreaterThan(0); });
  it("GrowthHackingAgent", async () => { const r = await getGrowthHackingAgent().run("u", input); expect(r.agentId).toBe("growth-hacking"); expect(r.result.length).toBeGreaterThan(0); });
  it("JobDescriptionTechAgent", async () => { const r = await getJobDescriptionTechAgent().run("u", input); expect(r.agentId).toBe("job-description-tech"); expect(r.result.length).toBeGreaterThan(0); });
  it("PRAndMediaAgent", async () => { const r = await getPRAndMediaAgent().run("u", input); expect(r.agentId).toBe("pr-and-media"); expect(r.result.length).toBeGreaterThan(0); });
  it("OnboardingEmailSequenceAgent", async () => { const r = await getOnboardingEmailSequenceAgent().run("u", input); expect(r.agentId).toBe("onboarding-email-sequence"); expect(r.result.length).toBeGreaterThan(0); });
  it("StartupSocialMediaAgent", async () => { const r = await getStartupSocialMediaAgent().run("u", input); expect(r.agentId).toBe("startup-social-media"); expect(r.result.length).toBeGreaterThan(0); });
});

