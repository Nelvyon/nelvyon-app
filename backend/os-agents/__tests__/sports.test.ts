// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getAthletePersonalBrandAgent,
  getClubCommunityAgent,
  getEsportsHighlightAgent,
  getFanEngagementAgent,
  getMatchDayContentAgent,
  getMerchandisingAgent,
  getPerformanceReportAgent,
  getSponsorshipDeckAgent,
  getTrainingContentAgent,
  getTransferNewsAgent,
  resetAthletePersonalBrandAgentForTests,
  resetClubCommunityAgentForTests,
  resetEsportsHighlightAgentForTests,
  resetFanEngagementAgentForTests,
  resetMatchDayContentAgentForTests,
  resetMerchandisingAgentForTests,
  resetPerformanceReportAgentForTests,
  resetSponsorshipDeckAgentForTests,
  resetTrainingContentAgentForTests,
  resetTransferNewsAgentForTests,
} from "../sectors/sports";

const llm = { complete: vi.fn() };
const setup = (json: unknown) => llm.complete.mockResolvedValue(JSON.stringify(json));

describe("Sports sector agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetAthletePersonalBrandAgentForTests();
    resetMatchDayContentAgentForTests();
    resetSponsorshipDeckAgentForTests();
    resetEsportsHighlightAgentForTests();
    resetFanEngagementAgentForTests();
    resetTransferNewsAgentForTests();
    resetMerchandisingAgentForTests();
    resetTrainingContentAgentForTests();
    resetClubCommunityAgentForTests();
    resetPerformanceReportAgentForTests();
  });

  it("AthletePersonalBrandAgent", async () => { setup({ narrative: "n", values: ["v"], differentiators: ["d"], tone: "t", contentPlanByPlatform: [{ platform: "ig", pillars: ["p"] }] }); const r = await getAthletePersonalBrandAgent().buildBrand("u", { athleteName: "A", sport: "football", goals: "grow" }); expect(r.narrative).toBe("n"); });
  it("MatchDayContentAgent", async () => { setup({ preMatch: ["a"], liveMatch: ["b"], postMatch: { win: ["c"], draw: ["d"], loss: ["e"] } }); const r = await getMatchDayContentAgent().generateMatchDayContent("u", { teamOrAthlete: "T", opponent: "R", platformSet: ["x"] }); expect(r.postMatch.win[0]).toBe("c"); });
  it("SponsorshipDeckAgent", async () => { setup({ executiveSummary: "s", collaborationFormats: ["f"], pricingRecommendation: "p", slideOutline: [{ title: "t", bullets: ["b"] }] }); const r = await getSponsorshipDeckAgent().createDeck("u", { entity: "E", audienceReach: "1M", metrics: "good", brandFit: "high" }); expect(r.pricingRecommendation).toBe("p"); });
  it("EsportsHighlightAgent", async () => { setup({ highlightScripts: ["s"], viralClipTitles: ["t"], youtubeDescription: "y", tiktokDescription: "k", socialPostText: ["x"] }); const r = await getEsportsHighlightAgent().generateHighlights("u", { game: "Valorant", keyMoments: "ace", team: "TL" }); expect(r.viralClipTitles[0]).toBe("t"); });
  it("FanEngagementAgent", async () => { setup({ campaigns: [{ name: "c", concept: "x", channels: ["ig"], kpi: "er" }], behindTheScenesIdeas: ["b"], qaConcepts: ["q"] }); const r = await getFanEngagementAgent().createEngagementPlan("u", { entity: "Club", sportType: "football", currentCommunityState: "stable" }); expect(r.campaigns[0].name).toBe("c"); });
  it("TransferNewsAgent", async () => { setup({ officialStatement: "o", socialPosts: ["s"], narrativeAngles: ["n"] }); const r = await getTransferNewsAgent().generateTransferComms("u", { team: "Club", playerOrStaff: "Player", eventType: "transfer", context: "summer" }); expect(r.officialStatement).toBe("o"); });
  it("MerchandisingAgent", async () => { setup({ productIdeas: [{ product: "shirt", concept: "retro", priceRange: "20-30" }], launchCampaigns: ["l"], directSalesStrategy: "d2c" }); const r = await getMerchandisingAgent().generateMerchPlan("u", { entity: "Club", audienceType: "fans", seasonOrMoment: "finals" }); expect(r.productIdeas[0].product).toBe("shirt"); });
  it("TrainingContentAgent", async () => { setup({ contentSeries: [{ title: "series", objective: "teach", platforms: ["yt"] }], drillsAndTips: ["tip"], expertPositioningPlan: "plan" }); const r = await getTrainingContentAgent().createTrainingContent("u", { athleteOrCoach: "Coach", discipline: "basket", audienceLevel: "beginner" }); expect(r.expertPositioningPlan).toBe("plan"); });
  it("ClubCommunityAgent", async () => { setup({ newsletters: [{ subject: "sub", outline: ["o"] }], seasonPosts: ["p"], memberCommunications: ["m"] }); const r = await getClubCommunityAgent().manageCommunity("u", { clubName: "RM", seasonGoal: "titles", memberSegments: "socios" }); expect(r.newsletters[0].subject).toBe("sub"); });
  it("PerformanceReportAgent", async () => { setup({ reach: "100k", engagement: "7%", growth: "+8%", sponsorships: "3", recommendations: ["r"] }); const r = await getPerformanceReportAgent().generateReport("u", { entity: "Club", month: "2026-05", metricsSummary: "good", sponsorshipsActive: "3" }); expect(r.recommendations[0]).toBe("r"); });
});

