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
  EsteticaAnalyticsAgent,
  EsteticaClientesAgent,
  EsteticaEmailAgent,
  EsteticaPreciosAgent,
  EsteticaReservasAgent,
  EsteticaReviewsAgent,
  EsteticaSEOAgent,
  EsteticaSocialAgent,
  resetAllEsteticaAgentsForTests,
} from "../sectors/estetica";

const ES_JSON = JSON.stringify({
  result: "Estética: reservas, clientes, SEO local y analytics.",
  score: 93,
  recommendations: ["Reservas online", "Google Reviews", "Ticket medio"],
});

const esteticaInput = {
  userId: "00000000-0000-0000-0000-00000000es01",
  businessName: "Salón demo",
  services: ["corte", "color"],
  targets: ["clientes locales", "parejas"],
};

describe("Estetica agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(ES_JSON);
    resetAllEsteticaAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("EsteticaReservasAgent", async () => {
    await assertOutput("estetica-reservas", () => EsteticaReservasAgent.instance.run(esteticaInput));
  });

  it("EsteticaClientesAgent", async () => {
    await assertOutput("estetica-clientes", () => EsteticaClientesAgent.instance.run(esteticaInput));
  });

  it("EsteticaPreciosAgent", async () => {
    await assertOutput("estetica-precios", () => EsteticaPreciosAgent.instance.run(esteticaInput));
  });

  it("EsteticaSEOAgent", async () => {
    await assertOutput("estetica-seo", () => EsteticaSEOAgent.instance.run(esteticaInput));
  });

  it("EsteticaSocialAgent", async () => {
    await assertOutput("estetica-social", () => EsteticaSocialAgent.instance.run(esteticaInput));
  });

  it("EsteticaEmailAgent", async () => {
    await assertOutput("estetica-email", () => EsteticaEmailAgent.instance.run(esteticaInput));
  });

  it("EsteticaReviewsAgent", async () => {
    await assertOutput("estetica-reviews", () => EsteticaReviewsAgent.instance.run(esteticaInput));
  });

  it("EsteticaAnalyticsAgent", async () => {
    await assertOutput("estetica-analytics", () => EsteticaAnalyticsAgent.instance.run(esteticaInput));
  });
});
