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
  MembershipPortalAccessAgent,
  MembershipPortalAnalyticsAgent,
  MembershipPortalBillingAgent,
  MembershipPortalCommunityAgent,
  MembershipPortalDesignAgent,
  MembershipPortalEngagementAgent,
  MembershipPortalOnboardingAgent,
  MembershipPortalReportAgent,
  resetAllMembershipPortalWhiteLabelAgentsForTests,
} from "../sectors/membershipportalwhitelabel";

const MPWL_JSON = JSON.stringify({
  content:
    "MembershipPortal: portal <15 min, branding 100%, Paddle, churn <5%, onboarding >80%, multi-tier ilimitados.",
  score: 94,
  highlights: ["<15 min", ">80% onboarding", "<5% churn"],
  metrics: ["MRR"],
});

const membershipPortalWhiteLabelInput = {
  userId: "00000000-0000-0000-0000-00000000mp01",
  sector: "saas",
  brand: "SaaS demo",
  portalBrief: "Portal white-label · tiers · Paddle",
  metricsBrief: "MRR · churn",
};

type MembershipPortalWhiteLabelOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("MembershipPortalWhiteLabel agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(MPWL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllMembershipPortalWhiteLabelAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as MembershipPortalWhiteLabelOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("MembershipPortalDesignAgent", async () => {
    await assertOutput("membershipportalwhitelabel-design", () =>
      MembershipPortalDesignAgent.instance.run(membershipPortalWhiteLabelInput),
    );
  });

  it("MembershipPortalAccessAgent", async () => {
    await assertOutput("membershipportalwhitelabel-access", () =>
      MembershipPortalAccessAgent.instance.run(membershipPortalWhiteLabelInput),
    );
  });

  it("MembershipPortalBillingAgent", async () => {
    await assertOutput("membershipportalwhitelabel-billing", () =>
      MembershipPortalBillingAgent.instance.run(membershipPortalWhiteLabelInput),
    );
  });

  it("MembershipPortalCommunityAgent", async () => {
    await assertOutput("membershipportalwhitelabel-community", () =>
      MembershipPortalCommunityAgent.instance.run(membershipPortalWhiteLabelInput),
    );
  });

  it("MembershipPortalEngagementAgent", async () => {
    await assertOutput("membershipportalwhitelabel-engagement", () =>
      MembershipPortalEngagementAgent.instance.run(membershipPortalWhiteLabelInput),
    );
  });

  it("MembershipPortalAnalyticsAgent", async () => {
    await assertOutput("membershipportalwhitelabel-analytics", () =>
      MembershipPortalAnalyticsAgent.instance.run(membershipPortalWhiteLabelInput),
    );
  });

  it("MembershipPortalOnboardingAgent", async () => {
    await assertOutput("membershipportalwhitelabel-onboarding", () =>
      MembershipPortalOnboardingAgent.instance.run(membershipPortalWhiteLabelInput),
    );
  });

  it("MembershipPortalReportAgent", async () => {
    await assertOutput("membershipportalwhitelabel-report", () =>
      MembershipPortalReportAgent.instance.run(membershipPortalWhiteLabelInput),
    );
  });
});
