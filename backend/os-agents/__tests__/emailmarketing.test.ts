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
  EmailAbandonedCartAgent,
  EmailDeliverabilityAdvisorAgent,
  EmailNewsletterBuilderAgent,
  EmailNurtureSequenceAgent,
  EmailPersonalizationEngineAgent,
  EmailPromotionalCampaignAgent,
  EmailReactivationAgent,
  EmailSubjectLineOptimizerAgent,
  EmailWelcomeSequenceAgent,
  resetAllEmailMarketingAgentsForTests,
} from "../sectors/emailmarketing";

const SAMPLE_JSON = JSON.stringify({
  content: "INBOX: Intent, Narrative, Benefit, Open, eXecute — borrador listo.",
  score: 84,
  subjectLines: ["Tu pedido te espera", "Últimas horas: envío gratis", "¿Necesitas ayuda para elegir?"],
  previewTexts: ["Completa tu compra hoy", "Solo hasta medianoche", "Te ayudamos en 1 clic"],
});

const baseInput = {
  userId: "00000000-0000-0000-0000-0000000000ff",
  sector: "ecommerce",
  brand: "ShopDemo",
  targetAudience: "Compradores ocasionales",
  campaignGoal: "Recuperar carritos",
  productOrService: "Electrónica",
  tone: "cercano",
};

describe("Email marketing masivo agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SAMPLE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllEmailMarketingAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertValid(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      subjectLines: string[];
      previewTexts: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.subjectLines.length).toBeGreaterThanOrEqual(1);
    expect(out.previewTexts.length).toBeGreaterThanOrEqual(1);
  }

  it("EmailSubjectLineOptimizerAgent", async () => {
    await assertValid("email-subject-line-optimizer", () => EmailSubjectLineOptimizerAgent.instance.run(baseInput));
  });

  it("EmailWelcomeSequenceAgent", async () => {
    await assertValid("email-welcome-sequence", () => EmailWelcomeSequenceAgent.instance.run(baseInput));
  });

  it("EmailNurtureSequenceAgent", async () => {
    await assertValid("email-nurture-sequence", () => EmailNurtureSequenceAgent.instance.run(baseInput));
  });

  it("EmailReactivationAgent", async () => {
    await assertValid("email-reactivation", () => EmailReactivationAgent.instance.run(baseInput));
  });

  it("EmailPromotionalCampaignAgent", async () => {
    await assertValid("email-promotional-campaign", () => EmailPromotionalCampaignAgent.instance.run(baseInput));
  });

  it("EmailAbandonedCartAgent", async () => {
    await assertValid("email-abandoned-cart", () => EmailAbandonedCartAgent.instance.run(baseInput));
  });

  it("EmailNewsletterBuilderAgent", async () => {
    await assertValid("email-newsletter-builder", () => EmailNewsletterBuilderAgent.instance.run(baseInput));
  });

  it("EmailPersonalizationEngineAgent", async () => {
    await assertValid("email-personalization-engine", () => EmailPersonalizationEngineAgent.instance.run(baseInput));
  });

  it("EmailDeliverabilityAdvisorAgent", async () => {
    await assertValid("email-deliverability-advisor", () => EmailDeliverabilityAdvisorAgent.instance.run(baseInput));
  });
});
