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
  MobileASORankingAgent,
  MobileDeepLinkStrategyAgent,
  MobileInAppMessagingAgent,
  MobileOnboardingFlowAgent,
  MobilePushNotificationAgent,
  MobileRatingRequestAgent,
  MobileRetentionFlowAgent,
  MobileRevenueOptimizationAgent,
  resetAllMobileAgentsForTests,
} from "../sectors/mobile";

const MOBILE_JSON = JSON.stringify({
  content: "INSTALL: Intent, Navigation, Sticky, Trial, Activate, Loop, Launch aplicado.",
  score: 87,
  screens: ["Splash → Permisos → Home", "Onboarding paso 2", "Activación feature clave"],
  features: ["Push opt-in contextual", "Deep link producto", "Paywall A/B"],
});

const mobileInput = {
  userId: "00000000-0000-0000-0000-0000000055ee",
  sector: "fintech",
  appName: "NovaWallet",
  platform: "both" as const,
  targetAudience: "Urban professionals",
  appGoal: "Activación D1",
};

describe("Mobile agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(MOBILE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllMobileAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertMobileOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      screens: string[];
      features: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.screens.length).toBeGreaterThanOrEqual(1);
    expect(out.features.length).toBeGreaterThanOrEqual(1);
  }

  it("MobileOnboardingFlowAgent", async () => {
    await assertMobileOutput("mobile-onboarding-flow", () => MobileOnboardingFlowAgent.instance.run(mobileInput));
  });

  it("MobilePushNotificationAgent", async () => {
    await assertMobileOutput("mobile-push-notification", () => MobilePushNotificationAgent.instance.run(mobileInput));
  });

  it("MobileASORankingAgent", async () => {
    await assertMobileOutput("mobile-aso-ranking", () => MobileASORankingAgent.instance.run(mobileInput));
  });

  it("MobileRetentionFlowAgent", async () => {
    await assertMobileOutput("mobile-retention-flow", () => MobileRetentionFlowAgent.instance.run(mobileInput));
  });

  it("MobileInAppMessagingAgent", async () => {
    await assertMobileOutput("mobile-in-app-messaging", () => MobileInAppMessagingAgent.instance.run(mobileInput));
  });

  it("MobileRatingRequestAgent", async () => {
    await assertMobileOutput("mobile-rating-request", () => MobileRatingRequestAgent.instance.run(mobileInput));
  });

  it("MobileDeepLinkStrategyAgent", async () => {
    await assertMobileOutput("mobile-deep-link-strategy", () => MobileDeepLinkStrategyAgent.instance.run(mobileInput));
  });

  it("MobileRevenueOptimizationAgent", async () => {
    await assertMobileOutput("mobile-revenue-optimization", () => MobileRevenueOptimizationAgent.instance.run(mobileInput));
  });
});
