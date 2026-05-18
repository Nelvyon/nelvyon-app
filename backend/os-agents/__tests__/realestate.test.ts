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
  getBuyerPersonaAgent,
  getLeadNurturingRealEstateAgent,
  getMarketReportAgent,
  getMortgageCalculatorContentAgent,
  getNeighborhoodGuideAgent,
  getOpenHouseEmailAgent,
  getPropertyDescriptionAgent,
  getPropertyPhotoPromptAgent,
  getPropertyVideoScriptAgent,
  getSocialProofAgent,
  resetBuyerPersonaAgentForTests,
  resetLeadNurturingRealEstateAgentForTests,
  resetMarketReportAgentForTests,
  resetMortgageCalculatorContentAgentForTests,
  resetNeighborhoodGuideAgentForTests,
  resetOpenHouseEmailAgentForTests,
  resetPropertyDescriptionAgentForTests,
  resetPropertyPhotoPromptAgentForTests,
  resetPropertyVideoScriptAgentForTests,
  resetSocialProofAgentForTests,
} from "../sectors/realestate";

const llm = { complete: vi.fn() };
const setup = (json: unknown) => llm.complete.mockResolvedValue(JSON.stringify(json));

describe("Realestate sector agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetPropertyDescriptionAgentForTests();
    resetPropertyPhotoPromptAgentForTests();
    resetBuyerPersonaAgentForTests();
    resetPropertyVideoScriptAgentForTests();
    resetOpenHouseEmailAgentForTests();
    resetMortgageCalculatorContentAgentForTests();
    resetNeighborhoodGuideAgentForTests();
    resetLeadNurturingRealEstateAgentForTests();
    resetSocialProofAgentForTests();
    resetMarketReportAgentForTests();
  });

  it("PropertyDescriptionAgent", async () => { setup({ portalDescription: "p", websiteDescription: "w", neighborhoodStory: "n", seoKeywords: ["k"], lifestyleAngle: "l" }); const r = await getPropertyDescriptionAgent().generateDescription("u", { propertyType: "flat", location: "Madrid", features: ["balcony"], targetBuyer: "family" }); expect(r.portalDescription).toBe("p"); });
  it("PropertyPhotoPromptAgent", async () => { setup({ prompt: "photo", virtualStagingNotes: ["s"], heroShotGuidance: "h" }); vi.mocked(GenerativeClient.generateImage).mockResolvedValue({ url: "https://x.test/photo.png", metadata: {} }); const r = await getPropertyPhotoPromptAgent().generatePhotoPrompt("u", { propertyType: "villa", style: "modern", keySellingPoints: ["pool"] }); expect(r.imageUrl).toContain("photo.png"); });
  it("BuyerPersonaAgent", async () => { setup({ demographics: ["d"], motivations: ["m"], objections: ["o"], channels: ["c"], keyMessage: "k" }); const r = await getBuyerPersonaAgent().createBuyerPersona("u", { propertyType: "loft", area: "center", priceRange: "300-500k" }); expect(r.keyMessage).toBe("k"); });
  it("PropertyVideoScriptAgent", async () => { setup({ fullNarration: "f", pointsOfInterest: ["p"], neighborhoodMentions: ["n"], cta: "c", reelVersion: "r" }); const r = await getPropertyVideoScriptAgent().generateVideoScript("u", { propertyType: "house", location: "Barcelona", highlights: ["garden"] }); expect(r.reelVersion).toBe("r"); });
  it("OpenHouseEmailAgent", async () => { setup({ invitation: "i", reminder: "r", postVisitFollowUp: "p", indecisiveNurturing: ["n"] }); const r = await getOpenHouseEmailAgent().createOpenHouseCampaign("u", { propertyType: "duplex", dateTime: "2026-06-01 18:00", audienceSegment: "investors" }); expect(r.reminder).toBe("r"); });
  it("MortgageCalculatorContentAgent", async () => { setup({ blogOutline: ["b"], socialExplainers: ["s"], emailEducationSequence: ["e"], expertPositioningMessage: "x" }); const r = await getMortgageCalculatorContentAgent().createMortgageContent("u", { buyerStage: "awareness", financingContext: "first time buyer", countryOrRegion: "ES" }); expect(r.expertPositioningMessage).toBe("x"); });
  it("NeighborhoodGuideAgent", async () => { setup({ servicesAndTransit: ["s"], schoolsAndLifestyle: ["l"], avgPricePerM2: "4500", trend: "up", salesMaterialVersion: "v" }); const r = await getNeighborhoodGuideAgent().createNeighborhoodGuide("u", { neighborhood: "Salamanca", city: "Madrid", propertyType: "apartment" }); expect(r.avgPricePerM2).toBe("4500"); });
  it("LeadNurturingRealEstateAgent", async () => { setup({ sequence: [{ step: 1, subject: "s", body: "b", cta: "c" }] }); const r = await getLeadNurturingRealEstateAgent().designNurturing("u", { leadSegment: "cold", propertyFocus: "new builds", urgencyLevel: "medium" }); expect(r.sequence[0].step).toBe(1); });
  it("SocialProofAgent", async () => { setup({ testimonialTemplates: ["t"], successCaseNarrative: "n", soldPostIdeas: ["s"], emotionalAngles: ["e"] }); const r = await getSocialProofAgent().generateSocialProof("u", { caseType: "seller", propertyType: "flat", outcome: "sold in 20 days" }); expect(r.successCaseNarrative).toBe("n"); });
  it("MarketReportAgent", async () => { setup({ priceTrends: ["p"], zoneComparison: ["z"], avgTimeOnMarket: "45 days", buyerRecommendations: ["b"], sellerRecommendations: ["s"] }); const r = await getMarketReportAgent().generateMarketReport("u", { city: "Madrid", zones: ["Chamberi"], propertyType: "residential", period: "Q2 2026" }); expect(r.avgTimeOnMarket).toContain("45"); });
});

