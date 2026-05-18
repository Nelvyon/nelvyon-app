// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});
vi.mock("../generative/GenerativeClient", () => ({
  GenerativeClient: { generateImage: vi.fn() },
}));

import { GenerativeClient } from "../generative/GenerativeClient";
import { LlmClient } from "../LlmClient";
import {
  getDeliveryOptimizationAgent,
  getEventPromotionAgent,
  getGoogleMyBusinessAgent,
  getInfluencerFoodAgent,
  getLoyaltyProgramAgent,
  getMenuCopywriterAgent,
  getReservationCampaignAgent,
  getReviewResponseAgent,
  getSeasonalMenuAgent,
  getSocialMenuAgent,
  resetDeliveryOptimizationAgentForTests,
  resetEventPromotionAgentForTests,
  resetGoogleMyBusinessAgentForTests,
  resetInfluencerFoodAgentForTests,
  resetLoyaltyProgramAgentForTests,
  resetMenuCopywriterAgentForTests,
  resetReservationCampaignAgentForTests,
  resetReviewResponseAgentForTests,
  resetSeasonalMenuAgentForTests,
  resetSocialMenuAgentForTests,
} from "../sectors/hospitality";

const llm = { complete: vi.fn() };
const setup = (json: unknown) => llm.complete.mockResolvedValue(JSON.stringify(json));

describe("Hospitality sector agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetMenuCopywriterAgentForTests();
    resetGoogleMyBusinessAgentForTests();
    resetReservationCampaignAgentForTests();
    resetReviewResponseAgentForTests();
    resetSocialMenuAgentForTests();
    resetEventPromotionAgentForTests();
    resetDeliveryOptimizationAgentForTests();
    resetLoyaltyProgramAgentForTests();
    resetInfluencerFoodAgentForTests();
    resetSeasonalMenuAgentForTests();
  });

  it("MenuCopywriterAgent", async () => { setup({ menuDescriptions: [{ dish: "x", copy: "y", ingredients: ["z"], sensoryAngle: "a" }] }); const r = await getMenuCopywriterAgent().generateMenuCopy("u", { venueType: "resto", cuisine: "fusion", dishes: ["x"] }); expect(r.menuDescriptions[0].dish).toBe("x"); });
  it("GoogleMyBusinessAgent", async () => { setup({ description: "d", categories: ["c"], weeklyPosts: ["p"], reviewRepliesPositive: ["rp"], reviewRepliesNegative: ["rn"], qa: ["q"], attributes: ["a"] }); const r = await getGoogleMyBusinessAgent().optimizeGmb("u", { businessName: "B", category: "rest", city: "Madrid", positioning: "premium" }); expect(r.description).toBe("d"); });
  it("ReservationCampaignAgent", async () => { setup({ emailCampaign: ["e"], socialPosts: ["s"], specialOffers: ["o"], thematicEvents: ["t"] }); const r = await getReservationCampaignAgent().createReservationCampaign("u", { businessType: "restaurant", lowDemandSlots: ["Mon 18:00"], audience: "local" }); expect(r.specialOffers[0]).toBe("o"); });
  it("ReviewResponseAgent", async () => { setup({ response: "r", sentiment: "negative", recoveryAction: "call us" }); const r = await getReviewResponseAgent().generateResponse("u", { platform: "google", rating: 2, reviewText: "bad", brandTone: "empathetic" }); expect(r.sentiment).toBe("negative"); });
  it("SocialMenuAgent", async () => { setup({ posts: ["p"], behindDishStories: ["b"], shortVideoIdeas: ["v"], imagePrompt: "photo prompt" }); vi.mocked(GenerativeClient.generateImage).mockResolvedValue({ url: "https://x.test/menu.png", metadata: {} }); const r = await getSocialMenuAgent().createSocialMenuContent("u", { menuTheme: "spring", season: "spring", platform: "instagram" }); expect(r.imageUrl).toContain("menu.png"); });
  it("EventPromotionAgent", async () => { setup({ eventCopy: "e", emailPlan: ["em"], socialPlan: ["sp"], landingPageOutline: ["lp"] }); const r = await getEventPromotionAgent().designEventPromotion("u", { eventType: "valentines", venue: "R", targetAudience: "couples", dateWindow: "feb" }); expect(r.eventCopy).toBe("e"); });
  it("DeliveryOptimizationAgent", async () => { setup({ titleAndDescriptionImprovements: ["t"], photoAndBundleIdeas: ["p"], scheduleStrategy: "s", visibilityStrategy: ["v"] }); const r = await getDeliveryOptimizationAgent().optimizeDeliveryPresence("u", { appMix: ["Glovo"], topProducts: ["Burger"], currentIssue: "low rank" }); expect(r.scheduleStrategy).toBe("s"); });
  it("LoyaltyProgramAgent", async () => { setup({ pointsModel: "p", frequencyBenefits: ["f"], birthdayEmail: "b", repeatVisitOffer: "r" }); const r = await getLoyaltyProgramAgent().designLoyaltyProgram("u", { venueType: "bar", avgTicket: 24, returnGoal: "repeat visits" }); expect(r.repeatVisitOffer).toBe("r"); });
  it("InfluencerFoodAgent", async () => { setup({ influencerProfiles: [{ handle: "@x", audienceFit: "fit", outreachMessage: "m" }], visitBrief: "b", publishGuidelines: ["g"], impactMaximization: ["i"] }); const r = await getInfluencerFoodAgent().generateInfluencerPlan("u", { city: "Barcelona", cuisineType: "mediterranean", campaignGoal: "awareness" }); expect(r.influencerProfiles[0].handle).toBe("@x"); });
  it("SeasonalMenuAgent", async () => { setup({ teaserSocial: ["t"], emailLaunch: ["e"], localPressNote: "p", inSeasonPostPlan: ["i"] }); const r = await getSeasonalMenuAgent().launchSeasonalMenu("u", { season: "winter", menuTheme: "comfort", audienceSegment: "families" }); expect(r.localPressNote).toBe("p"); });
});

