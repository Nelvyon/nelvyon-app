// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getAccountBasedMarketingAgent,
  getB2BContentStrategyAgent,
  getB2BLeadGenAgent,
  getCaseStudyAgent,
  getCompetitiveBattlecardAgent,
  getCustomerSuccessEmailAgent,
  getDemoScriptAgent,
  getLinkedInOutreachAgent,
  getNurturingCampaignAgent,
  getProposalGeneratorAgent,
  getRFPResponseAgent,
  getSalesEmailSequenceAgent,
  resetAccountBasedMarketingAgentForTests,
  resetB2BContentStrategyAgentForTests,
  resetB2BLeadGenAgentForTests,
  resetCaseStudyAgentForTests,
  resetCompetitiveBattlecardAgentForTests,
  resetCustomerSuccessEmailAgentForTests,
  resetDemoScriptAgentForTests,
  resetLinkedInOutreachAgentForTests,
  resetNurturingCampaignAgentForTests,
  resetProposalGeneratorAgentForTests,
  resetRFPResponseAgentForTests,
  resetSalesEmailSequenceAgentForTests,
} from "../sectors/b2b";

const llm = { complete: vi.fn() };
const setup = (json: unknown) => llm.complete.mockResolvedValue(JSON.stringify(json));

describe("B2B sector agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetB2BLeadGenAgentForTests();
    resetLinkedInOutreachAgentForTests();
    resetSalesEmailSequenceAgentForTests();
    resetProposalGeneratorAgentForTests();
    resetCaseStudyAgentForTests();
    resetCompetitiveBattlecardAgentForTests();
    resetAccountBasedMarketingAgentForTests();
    resetDemoScriptAgentForTests();
    resetRFPResponseAgentForTests();
    resetCustomerSuccessEmailAgentForTests();
    resetNurturingCampaignAgentForTests();
    resetB2BContentStrategyAgentForTests();
  });

  it("B2BLeadGenAgent", async () => { setup({ targetCompanies: [{ company: "A", fitReason: "fit", sourceIdeas: ["db"], firstMessage: "hi" }] }); const r = await getB2BLeadGenAgent().generateLeads("u", { industry: "SaaS", icp: "mid-market" }); expect(r.targetCompanies[0].company).toBe("A"); });
  it("LinkedInOutreachAgent", async () => { setup({ connectionRequest: "c", followUp1: "f1", followUp2: "f2", variants: ["v"] }); const r = await getLinkedInOutreachAgent().createSequence("u", { role: "CMO", sector: "fintech", offer: "platform" }); expect(r.followUp2).toBe("f2"); });
  it("SalesEmailSequenceAgent", async () => { setup({ sequence: [{ step: 1, subject: "s", body: "b", objectionHandled: "o", cta: "c" }] }); const r = await getSalesEmailSequenceAgent().generateSequence("u", { icpRole: "CTO", industry: "health", offer: "ai" }); expect(r.sequence[0].step).toBe(1); });
  it("ProposalGeneratorAgent", async () => { setup({ executiveSummary: "e", problemSolution: "p", roiEstimate: "r", pricing: "x", terms: ["t"] }); const r = await getProposalGeneratorAgent().generateProposal("u", { clientName: "Acme", problem: "slow", solution: "fast", budgetRange: "10-20k" }); expect(r.pricing).toBe("x"); });
  it("CaseStudyAgent", async () => { setup({ webVersion: "w", salesVersion: "s", clientQuote: "q" }); const r = await getCaseStudyAgent().generateCaseStudy("u", { clientIndustry: "retail", challenge: "low conv", solution: "new crm", quantifiedResults: "+22%" }); expect(r.clientQuote).toBe("q"); });
  it("CompetitiveBattlecardAgent", async () => { setup({ strengths: ["a"], competitorWeaknesses: ["b"], objectionHandling: ["c"], keyDifferentiators: ["d"] }); const r = await getCompetitiveBattlecardAgent().createBattlecard("u", { competitor: "CompX", yourOffer: "OfferY", targetSegment: "enterprise" }); expect(r.keyDifferentiators[0]).toBe("d"); });
  it("AccountBasedMarketingAgent", async () => { setup({ channelPlan: [{ channel: "email", message: "m", timing: "wk1" }], stakeholderMessaging: [{ stakeholder: "CFO", messageAngle: "roi" }] }); const r = await getAccountBasedMarketingAgent().designAbmCampaign("u", { targetAccount: "MegaCorp", stakeholders: ["CFO"], objective: "meeting" }); expect(r.channelPlan[0].channel).toBe("email"); });
  it("DemoScriptAgent", async () => { setup({ discoveryQuestions: ["q"], presentationFlow: ["f"], objectionHandling: ["o"], closingScript: "c" }); const r = await getDemoScriptAgent().createDemoScript("u", { product: "Suite", buyerRole: "VP Ops", painPoints: ["manual work"] }); expect(r.closingScript).toBe("c"); });
  it("RFPResponseAgent", async () => { setup({ structuredResponse: "s", keyDifferentiators: ["k"], valueProposition: "v" }); const r = await getRFPResponseAgent().generateRfpResponse("u", { rfpSummary: "public tender", differentiators: ["speed"], proposedApproach: "phase rollout" }); expect(r.structuredResponse).toBe("s"); });
  it("CustomerSuccessEmailAgent", async () => { setup({ onboardingSequence: [{ stage: "welcome", subject: "s", body: "b" }], upsellTouchpoint: "u", renewalTouchpoint: "r" }); const r = await getCustomerSuccessEmailAgent().createCustomerSuccessSequence("u", { customerType: "SMB", onboardingGoal: "activation", product: "platform" }); expect(r.upsellTouchpoint).toBe("u"); });
  it("NurturingCampaignAgent", async () => { setup({ touchpoints: [{ step: 1, channel: "email", contentAngle: "insight", cta: "read" }] }); const r = await getNurturingCampaignAgent().designNurturingCampaign("u", { audienceSegment: "cold leads", offer: "demo", valueThemes: ["roi"] }); expect(r.touchpoints[0].step).toBe(1); });
  it("B2BContentStrategyAgent", async () => { setup({ editorialCalendar: [{ week: "w1", channel: "blog", topic: "t", funnelStage: "tof" }], strategicThemes: ["x"] }); const r = await getB2BContentStrategyAgent().createContentStrategy("u", { industry: "SaaS", icp: "CFO", funnelStages: ["TOF","MOF","BOF"] }); expect(r.strategicThemes[0]).toBe("x"); });
});

