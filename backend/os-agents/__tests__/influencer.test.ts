// @ts-nocheck
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
  InfluencerAnalyticsAgent,
  InfluencerAvatarAgent,
  InfluencerBriefGeneratorAgent,
  InfluencerCalendarioAgent,
  InfluencerCampaignReportAgent,
  InfluencerComunidadAgent,
  InfluencerContenidoAgent,
  InfluencerContentCalendarAgent,
  InfluencerContractTermsAgent,
  InfluencerDiscoveryAgent,
  InfluencerFitScorerAgent,
  InfluencerIdentidadAgent,
  InfluencerMonetizacionAgent,
  InfluencerOutreachCrafterAgent,
  InfluencerROIProjectorAgent,
  InfluencerVozAgent,
  resetAllInfluencerAgentsForTests,
} from "../sectors/influencer";

const SAMPLE_JSON = JSON.stringify({
  content: "REACH: Research, Engage, Align, Convert, Harvest aplicados al caso.",
  result: "Virtual IA: identidad, contenido multi-red, avatar, voz, calendario y monetización.",
  score: 81,
  recommendations: [
    "Priorizar micro-influencers con engagement >4% en el nicho.",
    "Definir UTMs por creator y landing dedicada.",
    "Programar repurpose de assets ganadores en paid tras 7 días orgánico.",
  ],
});

const baseReachInput = {
  userId: "00000000-0000-0000-0000-0000000000bb",
  sector: "beauty",
  brand: "GlowCo",
  targetAudience: "Mujeres 25–40 skincare consciente",
  budget: "10k EUR",
  platforms: ["instagram", "tiktok"],
};

const baseOsInput = {
  userId: "00000000-0000-0000-0000-0000000000bb",
  businessName: "ACME Virtual IA",
  services: ["HeyGen", "ElevenLabs"],
  targets: ["Gen Z", "Tech"],
  metadata: { program: "influencer_v1" },
};

describe("Influencer sector agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(SAMPLE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllInfluencerAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("REACH marketing", () => {
    async function assertValidReach(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
      const out = (await runFn()) as {
        agentId: string;
        content: string;
        score: number;
        recommendations: string[];
      };
      expect(out.agentId).toBe(agentId);
      expect(out.content.length).toBeGreaterThan(0);
      expect(typeof out.score).toBe("number");
      expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
    }

    it("InfluencerDiscoveryAgent", async () => {
      await assertValidReach("influencer-discovery", () => InfluencerDiscoveryAgent.instance.run(baseReachInput));
    });

    it("InfluencerFitScorerAgent", async () => {
      await assertValidReach("influencer-fit-scorer", () => InfluencerFitScorerAgent.instance.run(baseReachInput));
    });

    it("InfluencerOutreachCrafterAgent", async () => {
      await assertValidReach("influencer-outreach-crafter", () =>
        InfluencerOutreachCrafterAgent.instance.run(baseReachInput),
      );
    });

    it("InfluencerBriefGeneratorAgent", async () => {
      await assertValidReach("influencer-brief-generator", () =>
        InfluencerBriefGeneratorAgent.instance.run(baseReachInput),
      );
    });

    it("InfluencerContractTermsAgent", async () => {
      await assertValidReach("influencer-contract-terms", () =>
        InfluencerContractTermsAgent.instance.run(baseReachInput),
      );
    });

    it("InfluencerROIProjectorAgent", async () => {
      await assertValidReach("influencer-roi-projector", () =>
        InfluencerROIProjectorAgent.instance.run(baseReachInput),
      );
    });

    it("InfluencerContentCalendarAgent", async () => {
      await assertValidReach("influencer-content-calendar", () =>
        InfluencerContentCalendarAgent.instance.run(baseReachInput),
      );
    });

    it("InfluencerCampaignReportAgent", async () => {
      await assertValidReach("influencer-campaign-report", () =>
        InfluencerCampaignReportAgent.instance.run(baseReachInput),
      );
    });
  });

  describe("Influencer virtual IA (MIG 237)", () => {
    async function assertValidVirtual(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
      const out = (await runFn()) as {
        agentId: string;
        result: string;
        score: number;
        recommendations: string[];
      };
      expect(out.agentId).toBe(agentId);
      expect(out.result.length).toBeGreaterThan(0);
      expect(typeof out.score).toBe("number");
      expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
    }

    it("InfluencerIdentidadAgent", async () => {
      await assertValidVirtual("influencer-identidad", () => InfluencerIdentidadAgent.instance().run(baseOsInput));
    });

    it("InfluencerContenidoAgent", async () => {
      await assertValidVirtual("influencer-contenido", () => InfluencerContenidoAgent.instance().run(baseOsInput));
    });

    it("InfluencerAvatarAgent", async () => {
      await assertValidVirtual("influencer-avatar", () => InfluencerAvatarAgent.instance().run(baseOsInput));
    });

    it("InfluencerVozAgent", async () => {
      await assertValidVirtual("influencer-voz", () => InfluencerVozAgent.instance().run(baseOsInput));
    });

    it("InfluencerCalendarioAgent", async () => {
      await assertValidVirtual("influencer-calendario", () => InfluencerCalendarioAgent.instance().run(baseOsInput));
    });

    it("InfluencerComunidadAgent", async () => {
      await assertValidVirtual("influencer-comunidad", () => InfluencerComunidadAgent.instance().run(baseOsInput));
    });

    it("InfluencerMonetizacionAgent", async () => {
      await assertValidVirtual("influencer-monetizacion", () => InfluencerMonetizacionAgent.instance().run(baseOsInput));
    });

    it("InfluencerAnalyticsAgent", async () => {
      await assertValidVirtual("influencer-analytics", () => InfluencerAnalyticsAgent.instance().run(baseOsInput));
    });
  });
});
