import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

const completeMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: completeMock,
    }),
  },
  LLM_DEFAULT_MAX_TOKENS: 4000,
  LLM_DEFAULT_MODEL: "gpt-4o",
}));

import {
  ReferralAnalyticsAgent,
  ReferralCampaignAgent,
  ReferralCodeGeneratorAgent,
  ReferralEmailAgent,
  ReferralFraudDetectorAgent,
  ReferralLeaderboardAgent,
  ReferralRewardAgent,
  ReferralTrackingAgent,
  resetAllReferralAgentsForTests,
} from "../sectors/referral";

const REFERRAL_JSON = JSON.stringify({
  content: "Programa referral: 30% primer pago crédito; 1 mes gratis referido; anti-fraude IP/device.",
  score: 88,
  highlights: ["Crédito billing idempotente", "Mes gratis en activación"],
  metrics: ["k-factor cohorte", "LTV referral vs orgánico"],
});

const referralInput = {
  userId: "00000000-0000-0000-0000-00000000ref1",
  sector: "saas",
  brand: "NELVYON",
  referralCode: "NLV-TEST",
  audienceHint: "agencias",
};

type ReferralOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Referral agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(REFERRAL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllReferralAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertReferralOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ReferralOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("ReferralCodeGeneratorAgent", async () => {
    await assertReferralOutput("referral-code-generator", () => ReferralCodeGeneratorAgent.instance.run(referralInput));
  });

  it("ReferralTrackingAgent", async () => {
    await assertReferralOutput("referral-tracking", () => ReferralTrackingAgent.instance.run(referralInput));
  });

  it("ReferralRewardAgent", async () => {
    await assertReferralOutput("referral-reward", () => ReferralRewardAgent.instance.run(referralInput));
  });

  it("ReferralFraudDetectorAgent", async () => {
    await assertReferralOutput("referral-fraud-detector", () => ReferralFraudDetectorAgent.instance.run(referralInput));
  });

  it("ReferralEmailAgent", async () => {
    await assertReferralOutput("referral-email", () => ReferralEmailAgent.instance.run(referralInput));
  });

  it("ReferralLeaderboardAgent", async () => {
    await assertReferralOutput("referral-leaderboard", () => ReferralLeaderboardAgent.instance.run(referralInput));
  });

  it("ReferralAnalyticsAgent", async () => {
    await assertReferralOutput("referral-analytics", () => ReferralAnalyticsAgent.instance.run(referralInput));
  });

  it("ReferralCampaignAgent", async () => {
    await assertReferralOutput("referral-campaign", () => ReferralCampaignAgent.instance.run(referralInput));
  });
});
