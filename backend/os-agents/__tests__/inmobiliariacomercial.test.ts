// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  InmobiliariaComercialAnalyticsAgent,
  InmobiliariaComercialEmailAgent,
  InmobiliariaComercialLeadGenAgent,
  InmobiliariaComercialListingsAgent,
  InmobiliariaComercialPreciosAgent,
  InmobiliariaComercialReviewsAgent,
  InmobiliariaComercialSEOAgent,
  InmobiliariaComercialSocialAgent,
  resetAllInmobiliariaComercialAgentsForTests,
} from "../sectors/inmobiliariacomercial";

const IC_JSON = JSON.stringify({
  result: "Inmobiliaria comercial: leads B2B, listings y conversión.",
  score: 93,
  recommendations: ["ABM LinkedIn", "Ficha unificada", "Win rate visitas"],
});

const inmobiliariaComercialInput = {
  userId: "00000000-0000-0000-0000-00000000ic01",
  businessName: "Agencia demo",
  services: ["oficinas", "naves"],
  targets: ["inversores"],
};

describe("Inmobiliaria comercial agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(IC_JSON);
    resetAllInmobiliariaComercialAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("InmobiliariaComercialLeadGenAgent", async () => {
    await assertOutput("inmobiliariacomercial-leadgen", () =>
      InmobiliariaComercialLeadGenAgent.instance().run(inmobiliariaComercialInput),
    );
  });

  it("InmobiliariaComercialListingsAgent", async () => {
    await assertOutput("inmobiliariacomercial-listings", () =>
      InmobiliariaComercialListingsAgent.instance().run(inmobiliariaComercialInput),
    );
  });

  it("InmobiliariaComercialPreciosAgent", async () => {
    await assertOutput("inmobiliariacomercial-precios", () =>
      InmobiliariaComercialPreciosAgent.instance().run(inmobiliariaComercialInput),
    );
  });

  it("InmobiliariaComercialSEOAgent", async () => {
    await assertOutput("inmobiliariacomercial-seo", () =>
      InmobiliariaComercialSEOAgent.instance().run(inmobiliariaComercialInput),
    );
  });

  it("InmobiliariaComercialSocialAgent", async () => {
    await assertOutput("inmobiliariacomercial-social", () =>
      InmobiliariaComercialSocialAgent.instance().run(inmobiliariaComercialInput),
    );
  });

  it("InmobiliariaComercialEmailAgent", async () => {
    await assertOutput("inmobiliariacomercial-email", () =>
      InmobiliariaComercialEmailAgent.instance().run(inmobiliariaComercialInput),
    );
  });

  it("InmobiliariaComercialReviewsAgent", async () => {
    await assertOutput("inmobiliariacomercial-reviews", () =>
      InmobiliariaComercialReviewsAgent.instance().run(inmobiliariaComercialInput),
    );
  });

  it("InmobiliariaComercialAnalyticsAgent", async () => {
    await assertOutput("inmobiliariacomercial-analytics", () =>
      InmobiliariaComercialAnalyticsAgent.instance().run(inmobiliariaComercialInput),
    );
  });
});
