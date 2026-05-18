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
  EventosAnalyticsAgent,
  EventosClientesAgent,
  EventosEmailAgent,
  EventosPortfolioAgent,
  EventosPreciosAgent,
  EventosReviewsAgent,
  EventosSEOAgent,
  EventosSocialAgent,
  resetAllEventosAgentsForTests,
} from "../sectors/eventos";

const EV_JSON = JSON.stringify({
  result: "Eventos y bodas: portfolio, captación, paquetes y analytics.",
  score: 93,
  recommendations: ["Galería visual", "Captación parejas", "Email estacional"],
});

const eventosInput = {
  userId: "00000000-0000-0000-0000-00000000ev01",
  businessName: "Wedding demo",
  services: ["planificación", "catering"],
  targets: ["parejas", "eventos corporativos"],
};

describe("Eventos agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(EV_JSON);
    resetAllEventosAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("EventosPortfolioAgent", async () => {
    await assertOutput("eventos-portfolio", () => EventosPortfolioAgent.instance.run(eventosInput));
  });

  it("EventosClientesAgent", async () => {
    await assertOutput("eventos-clientes", () => EventosClientesAgent.instance.run(eventosInput));
  });

  it("EventosPreciosAgent", async () => {
    await assertOutput("eventos-precios", () => EventosPreciosAgent.instance.run(eventosInput));
  });

  it("EventosSEOAgent", async () => {
    await assertOutput("eventos-seo", () => EventosSEOAgent.instance.run(eventosInput));
  });

  it("EventosSocialAgent", async () => {
    await assertOutput("eventos-social", () => EventosSocialAgent.instance.run(eventosInput));
  });

  it("EventosEmailAgent", async () => {
    await assertOutput("eventos-email", () => EventosEmailAgent.instance.run(eventosInput));
  });

  it("EventosReviewsAgent", async () => {
    await assertOutput("eventos-reviews", () => EventosReviewsAgent.instance.run(eventosInput));
  });

  it("EventosAnalyticsAgent", async () => {
    await assertOutput("eventos-analytics", () => EventosAnalyticsAgent.instance.run(eventosInput));
  });
});
