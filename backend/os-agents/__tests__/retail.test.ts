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
  RetailAnalyticsAgent,
  RetailEmailSMSAgent,
  RetailFidelizacionAgent,
  RetailInventarioAgent,
  RetailPreciosAgent,
  RetailPresenciaAgent,
  RetailReviewsAgent,
  RetailSocialAgent,
  resetAllRetailAgentsForTests,
} from "../sectors/retail";

const RETAIL_JSON = JSON.stringify({
  content:
    "Retail: top 3 Maps <90 d, demanda >88%, pricing 24 h, fidelización auto, reviews <1 h, LTV +35% 6m.",
  score: 94,
  highlights: ["Top 3 Maps", ">88% demanda", "LTV +35%"],
  metrics: ["LTV 6m"],
});

const retailInput = {
  userId: "00000000-0000-0000-0000-00000000rt01",
  sector: "retail",
  brand: "Tienda demo",
  retailBrief: "Retail · tienda física",
  metricsBrief: "Maps · pricing · LTV",
};

type RetailOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Retail agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(RETAIL_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllRetailAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as RetailOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("RetailPresenciaAgent", async () => {
    await assertOutput("retail-retailpresencia", () => RetailPresenciaAgent.instance.run(retailInput));
  });

  it("RetailInventarioAgent", async () => {
    await assertOutput("retail-retailinventario", () => RetailInventarioAgent.instance.run(retailInput));
  });

  it("RetailPreciosAgent", async () => {
    await assertOutput("retail-retailprecios", () => RetailPreciosAgent.instance.run(retailInput));
  });

  it("RetailFidelizacionAgent", async () => {
    await assertOutput("retail-retailfidelizacion", () => RetailFidelizacionAgent.instance.run(retailInput));
  });

  it("RetailEmailSMSAgent", async () => {
    await assertOutput("retail-retailemailsms", () => RetailEmailSMSAgent.instance.run(retailInput));
  });

  it("RetailSocialAgent", async () => {
    await assertOutput("retail-retailsocial", () => RetailSocialAgent.instance.run(retailInput));
  });

  it("RetailReviewsAgent", async () => {
    await assertOutput("retail-retailreviews", () => RetailReviewsAgent.instance.run(retailInput));
  });

  it("RetailAnalyticsAgent", async () => {
    await assertOutput("retail-retailanalytics", () => RetailAnalyticsAgent.instance.run(retailInput));
  });
});
