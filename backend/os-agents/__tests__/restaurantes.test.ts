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
  RestauranteAnalyticsAgent,
  RestauranteEmailSMSAgent,
  RestauranteMenuAgent,
  RestaurantePresenciaAgent,
  RestauranteReservasAgent,
  RestauranteReviewsAgent,
  RestauranteSEOLocalAgent,
  RestauranteSocialAgent,
  resetAllRestaurantesAgentsForTests,
} from "../sectors/restaurantes";

const REST_JSON = JSON.stringify({
  content:
    "Restaurantes: top 3 Maps <90 d, reviews <1 h, no-shows - >60%, ticket +20%, RRSS diario, 0 manual reputación.",
  score: 94,
  highlights: ["Top 3 Maps", "<1 h reviews", "RRSS diario"],
  metrics: ["No-show rate"],
});

const restaurantesInput = {
  userId: "00000000-0000-0000-0000-00000000rs01",
  sector: "hosteleria",
  brand: "Restaurante demo",
  restaurantesBrief: "Restaurantes · reservas",
  metricsBrief: "Maps · reseñas · ticket",
};

type RestaurantesOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Restaurantes agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(REST_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllRestaurantesAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as RestaurantesOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("RestaurantePresenciaAgent", async () => {
    await assertOutput("restaurantes-restaurantepresencia", () =>
      RestaurantePresenciaAgent.instance.run(restaurantesInput),
    );
  });

  it("RestauranteReviewsAgent", async () => {
    await assertOutput("restaurantes-restaurantereviews", () =>
      RestauranteReviewsAgent.instance.run(restaurantesInput),
    );
  });

  it("RestauranteSEOLocalAgent", async () => {
    await assertOutput("restaurantes-restauranteseolocal", () =>
      RestauranteSEOLocalAgent.instance.run(restaurantesInput),
    );
  });

  it("RestauranteMenuAgent", async () => {
    await assertOutput("restaurantes-restaurantemenu", () => RestauranteMenuAgent.instance.run(restaurantesInput));
  });

  it("RestauranteReservasAgent", async () => {
    await assertOutput("restaurantes-restaurantereservas", () =>
      RestauranteReservasAgent.instance.run(restaurantesInput),
    );
  });

  it("RestauranteEmailSMSAgent", async () => {
    await assertOutput("restaurantes-restauranteemailsms", () =>
      RestauranteEmailSMSAgent.instance.run(restaurantesInput),
    );
  });

  it("RestauranteSocialAgent", async () => {
    await assertOutput("restaurantes-restaurantesocial", () => RestauranteSocialAgent.instance.run(restaurantesInput));
  });

  it("RestauranteAnalyticsAgent", async () => {
    await assertOutput("restaurantes-restauranteanalytics", () =>
      RestauranteAnalyticsAgent.instance.run(restaurantesInput),
    );
  });
});
