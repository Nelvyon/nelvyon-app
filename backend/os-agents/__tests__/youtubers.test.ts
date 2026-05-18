// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return {
    ...actual,
    LlmClient: { ...actual.LlmClient, getInstance: vi.fn() },
  };
});

vi.mock("../generative/GenerativeClient", () => ({
  GenerativeClient: { generateImage: vi.fn() },
}));

import { GenerativeClient } from "../generative/GenerativeClient";
import { LlmClient } from "../LlmClient";
import {
  getAnalyticsInterpreterAgent,
  getChaptersAgent,
  getCollabFinderAgent,
  getCommunityPostAgent,
  getDescriptionSEOAgent,
  getIdeaGeneratorAgent,
  getMonetizationAdvisorAgent,
  getScriptWriterAgent,
  getShortsAdapterAgent,
  getSponsorshipEmailAgent,
  getThumbnailPromptAgent,
  getTitleOptimizerAgent,
  getVideoSEOAuditAgent,
  resetAnalyticsInterpreterAgentForTests,
  resetChaptersAgentForTests,
  resetCollabFinderAgentForTests,
  resetCommunityPostAgentForTests,
  resetDescriptionSEOAgentForTests,
  resetIdeaGeneratorAgentForTests,
  resetMonetizationAdvisorAgentForTests,
  resetScriptWriterAgentForTests,
  resetShortsAdapterAgentForTests,
  resetSponsorshipEmailAgentForTests,
  resetThumbnailPromptAgentForTests,
  resetTitleOptimizerAgentForTests,
  resetVideoSEOAuditAgentForTests,
} from "../sectors/youtubers";

const llm = { complete: vi.fn() };

function setup(json: unknown): void {
  llm.complete.mockResolvedValue(JSON.stringify(json));
}

describe("Youtubers sector agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetIdeaGeneratorAgentForTests();
    resetScriptWriterAgentForTests();
    resetThumbnailPromptAgentForTests();
    resetTitleOptimizerAgentForTests();
    resetDescriptionSEOAgentForTests();
    resetChaptersAgentForTests();
    resetCommunityPostAgentForTests();
    resetShortsAdapterAgentForTests();
    resetMonetizationAdvisorAgentForTests();
    resetAnalyticsInterpreterAgentForTests();
    resetCollabFinderAgentForTests();
    resetSponsorshipEmailAgentForTests();
    resetVideoSEOAuditAgentForTests();
  });

  it("IdeaGeneratorAgent", async () => {
    setup({ ideas: [{ title: "t", description: "d", hooks: ["h"], idealDuration: "8m", seoKeywords: ["k"] }] });
    const r = await getIdeaGeneratorAgent().generateIdeas("u", { niche: "tech", channelContext: "ctx", targetAudience: "aud" });
    expect(r.ideas[0].title).toBe("t");
    expect(llm.complete.mock.calls[0][1].temperature).toBe(0.8);
  });

  it("ScriptWriterAgent", async () => {
    setup({ introHook30s: "h", chapters: [{ title: "a", summary: "b" }], fullScript: "s", cta: "c" });
    const r = await getScriptWriterAgent().writeScript("u", { title: "x", idea: "y", channelStyle: "z" });
    expect(r.fullScript).toBe("s");
    expect(llm.complete.mock.calls[0][1].temperature).toBe(0.7);
  });

  it("ThumbnailPromptAgent", async () => {
    setup({ prompt: "dalle prompt" });
    vi.mocked(GenerativeClient.generateImage).mockResolvedValue({ url: "https://x.test/img.png", metadata: {} });
    const r = await getThumbnailPromptAgent().generateThumbnail("u", { title: "x", niche: "n" });
    expect(r.imageUrl).toContain("img.png");
    expect(GenerativeClient.generateImage).toHaveBeenCalled();
  });

  it("TitleOptimizerAgent", async () => {
    setup({ variants: [{ title: "a", score: 88, rationale: "r" }] });
    const r = await getTitleOptimizerAgent().optimizeTitle("u", { baseTitle: "x", niche: "n", audience: "a" });
    expect(r.variants[0].score).toBe(88);
  });

  it("DescriptionSEOAgent", async () => {
    setup({ description: "d", keywords: ["k"], timestamps: ["00:00"], hashtags: ["#x"] });
    const r = await getDescriptionSEOAgent().generateDescription("u", { title: "t", transcriptSummary: "s" });
    expect(r.hashtags[0]).toBe("#x");
  });

  it("ChaptersAgent", async () => {
    setup({ chapters: [{ timestamp: "00:00", title: "Intro", objective: "Hook" }] });
    const r = await getChaptersAgent().generateChapters("u", { script: "abc" });
    expect(r.chapters[0].timestamp).toBe("00:00");
  });

  it("CommunityPostAgent", async () => {
    setup({ posts: [{ text: "p", cta: "c", poll: ["a", "b"] }] });
    const r = await getCommunityPostAgent().generatePosts("u", { topic: "x", objective: "engagement" });
    expect(r.posts).toHaveLength(1);
  });

  it("ShortsAdapterAgent", async () => {
    setup({ shorts: [{ hook3s: "h", script: "s", visualDirection: "v", cta: "c" }] });
    const r = await getShortsAdapterAgent().adaptToShorts("u", { longVideoTopic: "x", transcriptOrScript: "y" });
    expect(r.shorts[0].hook3s).toBe("h");
  });

  it("MonetizationAdvisorAgent", async () => {
    setup({ strategies: [{ channel: "memberships", actionPlan: "a", estimatedMonthlyRevenue: 2000 }] });
    const r = await getMonetizationAdvisorAgent().adviseMonetization("u", { niche: "x", subscribers: 10000, viewsPerMonth: 250000 });
    expect(r.strategies[0].estimatedMonthlyRevenue).toBe(2000);
  });

  it("AnalyticsInterpreterAgent", async () => {
    setup({ diagnosis: "ok", prioritizedActions: [{ priority: "high", action: "a", expectedImpact: "b" }] });
    const r = await getAnalyticsInterpreterAgent().interpretAnalytics("u", { ctr: 4, retention: 42, rpm: 3, subscribersDelta: 150 });
    expect(r.prioritizedActions[0].priority).toBe("high");
  });

  it("CollabFinderAgent", async () => {
    setup({ creators: [{ name: "Creator A", rationale: "fit", fitScore: 90, proposedCollabFormat: "duo challenge" }] });
    const r = await getCollabFinderAgent().findCollabs("u", { niche: "x", channelSize: "mid", audienceProfile: "gen z" });
    expect(r.creators[0].fitScore).toBe(90);
  });

  it("SponsorshipEmailAgent", async () => {
    setup({ subject: "s", body: "b", estimatedBudgetRange: "2k-4k" });
    const r = await getSponsorshipEmailAgent().generateSponsorshipEmail("u", { brandName: "Brand", niche: "x", channelMetrics: "100k subs" });
    expect(r.estimatedBudgetRange).toContain("k");
  });

  it("VideoSEOAuditAgent", async () => {
    setup({ score: 72, prioritizedImprovements: [{ area: "title", issue: "weak keyword", recommendation: "add intent", priority: "high" }] });
    const r = await getVideoSEOAuditAgent().auditVideoSeo("u", { title: "x", description: "y", tags: ["z"], transcriptSummary: "s" });
    expect(r.score).toBe(72);
  });
});
