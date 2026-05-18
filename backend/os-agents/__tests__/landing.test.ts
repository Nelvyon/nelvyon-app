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
  LandingABVariantAgent,
  LandingBenefitsSectionAgent,
  LandingConversionAuditAgent,
  LandingFAQBuilderAgent,
  LandingHeroCopyAgent,
  LandingMobileFirstAgent,
  LandingSocialProofAgent,
  LandingUrgencyAgent,
  resetAllLandingAgentsForTests,
} from "../sectors/landing";

const SAMPLE_JSON = JSON.stringify({
  content: "CONVERT: Capture, Objection, Narrative, Value, Evidence, Resolve, Test aplicado.",
  score: 81,
  sections: ["Hero", "Beneficios", "FAQ", "CTA final"],
  ctaVariants: ["Empezar gratis", "Ver demo", "Hablar con ventas"],
});

const baseInput = {
  userId: "00000000-0000-0000-0000-0000000011aa",
  sector: "saas",
  brand: "Nelvyon Labs",
  campaignGoal: "Leads demo",
  targetAudience: "Marketing managers",
  product: "OS agents",
  tone: "premium",
  cta: "Reservar demo",
};

describe("Landing page builder agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SAMPLE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllLandingAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertValid(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      sections: string[];
      ctaVariants: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.sections.length).toBeGreaterThanOrEqual(1);
    expect(out.ctaVariants.length).toBeGreaterThanOrEqual(1);
  }

  it("LandingHeroCopyAgent", async () => {
    await assertValid("landing-hero-copy", () => LandingHeroCopyAgent.instance.run(baseInput));
  });

  it("LandingBenefitsSectionAgent", async () => {
    await assertValid("landing-benefits-section", () => LandingBenefitsSectionAgent.instance.run(baseInput));
  });

  it("LandingSocialProofAgent", async () => {
    await assertValid("landing-social-proof", () => LandingSocialProofAgent.instance.run(baseInput));
  });

  it("LandingFAQBuilderAgent", async () => {
    await assertValid("landing-faq-builder", () => LandingFAQBuilderAgent.instance.run(baseInput));
  });

  it("LandingUrgencyAgent", async () => {
    await assertValid("landing-urgency", () => LandingUrgencyAgent.instance.run(baseInput));
  });

  it("LandingMobileFirstAgent", async () => {
    await assertValid("landing-mobile-first", () => LandingMobileFirstAgent.instance.run(baseInput));
  });

  it("LandingABVariantAgent", async () => {
    await assertValid("landing-ab-variant", () => LandingABVariantAgent.instance.run(baseInput));
  });

  it("LandingConversionAuditAgent", async () => {
    await assertValid("landing-conversion-audit", () => LandingConversionAuditAgent.instance.run(baseInput));
  });
});
