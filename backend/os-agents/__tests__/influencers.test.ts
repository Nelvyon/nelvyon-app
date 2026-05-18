// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getAudienceAnalysisAgent,
  getBioOptimizerAgent,
  getBrandDealNegotiatorAgent,
  getCaptionWriterAgent,
  getCollabPitchAgent,
  getCompetitorAnalysisAgent,
  getContentCalendarAgent,
  getHashtagStrategyAgent,
  getMonetizationPlanAgent,
  getReelIdeaAgent,
  getStoryScriptAgent,
  getViralHookAgent,
  resetAudienceAnalysisAgentForTests,
  resetBioOptimizerAgentForTests,
  resetBrandDealNegotiatorAgentForTests,
  resetCaptionWriterAgentForTests,
  resetCollabPitchAgentForTests,
  resetCompetitorAnalysisAgentForTests,
  resetContentCalendarAgentForTests,
  resetHashtagStrategyAgentForTests,
  resetMonetizationPlanAgentForTests,
  resetReelIdeaAgentForTests,
  resetStoryScriptAgentForTests,
  resetViralHookAgentForTests,
} from "../sectors/influencers";

const llm = { complete: vi.fn() };
const setup = (json: unknown) => llm.complete.mockResolvedValue(JSON.stringify(json));

describe("Influencers sector agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetContentCalendarAgentForTests(); resetCaptionWriterAgentForTests(); resetHashtagStrategyAgentForTests();
    resetStoryScriptAgentForTests(); resetReelIdeaAgentForTests(); resetBrandDealNegotiatorAgentForTests();
    resetAudienceAnalysisAgentForTests(); resetCompetitorAnalysisAgentForTests(); resetViralHookAgentForTests();
    resetBioOptimizerAgentForTests(); resetCollabPitchAgentForTests(); resetMonetizationPlanAgentForTests();
  });

  it("ContentCalendarAgent", async () => { setup({ calendar: [{ platform: "instagram", day: "Mon", time: "18:00", theme: "x", format: "reel" }] }); const r = await getContentCalendarAgent().generateCalendar("u", { niche: "fashion", goals: "growth", platforms: ["instagram"] }); expect(r.calendar[0].platform).toBe("instagram"); });
  it("CaptionWriterAgent", async () => { setup({ captions: [{ text: "c", hooks: ["h"], cta: "cta", hashtags: ["#x"] }] }); const r = await getCaptionWriterAgent().writeCaptions("u", { platform: "instagram", topic: "x", tone: "bold" }); expect(r.captions[0].cta).toBe("cta"); });
  it("HashtagStrategyAgent", async () => { setup({ strategy: [{ bucket: "nicho", tags: ["#x"], estimatedReach: "10k" }] }); const r = await getHashtagStrategyAgent().generateStrategy("u", { niche: "x", platform: "instagram", postTopic: "y" }); expect(r.strategy[0].bucket).toBe("nicho"); });
  it("StoryScriptAgent", async () => { setup({ scenes: [{ beat: "hook", script: "s", onScreenText: "t", music: "m", effects: ["e"] }] }); const r = await getStoryScriptAgent().generateStory("u", { topic: "x", platform: "instagram", goal: "engagement" }); expect(r.scenes[0].beat).toBe("hook"); });
  it("ReelIdeaAgent", async () => { setup({ ideas: [{ concept: "c", trendingAudio: "a", overlayText: "o", potentialReach: "50k" }] }); const r = await getReelIdeaAgent().generateReelIdeas("u", { niche: "x", audience: "z" }); expect(r.ideas[0].trendingAudio).toBe("a"); });
  it("BrandDealNegotiatorAgent", async () => { setup({ fairRate: 1500, proposal: "p", negotiationEmail: "e" }); const r = await getBrandDealNegotiatorAgent().negotiateDeal("u", { followers: 100000, avgViews: 25000, engagementRate: 4.2, niche: "x", brand: "b" }); expect(r.fairRate).toBe(1500); });
  it("AudienceAnalysisAgent", async () => { setup({ insights: ["i"], engagementActions: ["a"], growthActions: ["g"] }); const r = await getAudienceAnalysisAgent().analyzeAudience("u", { demographics: "d", interests: "i", behavior: "b" }); expect(r.growthActions[0]).toBe("g"); });
  it("CompetitorAnalysisAgent", async () => { setup({ gaps: ["g"], opportunities: ["o"], differentiationPlan: "p" }); const r = await getCompetitorAnalysisAgent().analyzeCompetitors("u", { niche: "x", competitors: ["a"], platform: "instagram" }); expect(r.opportunities[0]).toBe("o"); });
  it("ViralHookAgent", async () => { setup({ hooks: [{ text: "h", pattern: "p", retentionIntent: "r" }] }); const r = await getViralHookAgent().generateHooks("u", { niche: "x", contentType: "reel", audience: "z" }); expect(r.hooks[0].text).toBe("h"); });
  it("BioOptimizerAgent", async () => { setup({ optimizedBio: "b", keywordFocus: ["k"], cta: "c" }); const r = await getBioOptimizerAgent().optimizeBio("u", { platform: "instagram", currentBio: "old", niche: "x" }); expect(r.cta).toBe("c"); });
  it("CollabPitchAgent", async () => { setup({ valueProposition: "v", formatProposal: "f", contactMessage: "m" }); const r = await getCollabPitchAgent().generatePitch("u", { yourProfile: "p", targetInfluencer: "t", collabGoal: "g" }); expect(r.formatProposal).toBe("f"); });
  it("MonetizationPlanAgent", async () => { setup({ channels: [{ channel: "ugc", plan: "p", estimatedMonthlyRevenue: 800 }] }); const r = await getMonetizationPlanAgent().createMonetizationPlan("u", { niche: "x", audienceSize: 50000, strengths: "storytelling" }); expect(r.channels[0].estimatedMonthlyRevenue).toBe(800); });
});

