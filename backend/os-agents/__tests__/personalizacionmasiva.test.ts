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
  PersonalizacionMasivaAdsAgent,
  PersonalizacionMasivaAnalyticsAgent,
  PersonalizacionMasivaContentAgent,
  PersonalizacionMasivaEmailAgent,
  PersonalizacionMasivaOfferAgent,
  PersonalizacionMasivaSegmentAgent,
  PersonalizacionMasivaTimingAgent,
  PersonalizacionMasivaWebAgent,
  resetAllPersonalizacionMasivaAgentsForTests,
} from "../sectors/personalizacionmasiva";

const PM_JSON = JSON.stringify({
  content:
    "PersonalizacionMasiva: 1-a-1 millones, web <100ms, email >20 vars, +35% uplift, segmentación RT, 0% duplicado.",
  score: 91,
  highlights: ["1-a-1 millones", "Web <100ms", "+35% uplift"],
  metrics: ["Personalization uplift"],
});

const personalizacionMasivaInput = {
  userId: "00000000-0000-0000-0000-00000000pm01",
  sector: "b2c",
  brand: "B2C demo",
  personalizationBrief: "Millones de contactos · 1-a-1 real",
  metricsBrief: "Uplift conversión · latencia web",
};

type PersonalizacionMasivaOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("PersonalizacionMasiva agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(PM_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllPersonalizacionMasivaAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as PersonalizacionMasivaOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("PersonalizacionMasivaSegmentAgent", async () => {
    await assertOutput("personalizacionmasiva-segment", () =>
      PersonalizacionMasivaSegmentAgent.instance.run(personalizacionMasivaInput),
    );
  });

  it("PersonalizacionMasivaContentAgent", async () => {
    await assertOutput("personalizacionmasiva-content", () =>
      PersonalizacionMasivaContentAgent.instance.run(personalizacionMasivaInput),
    );
  });

  it("PersonalizacionMasivaEmailAgent", async () => {
    await assertOutput("personalizacionmasiva-email", () =>
      PersonalizacionMasivaEmailAgent.instance.run(personalizacionMasivaInput),
    );
  });

  it("PersonalizacionMasivaWebAgent", async () => {
    await assertOutput("personalizacionmasiva-web", () =>
      PersonalizacionMasivaWebAgent.instance.run(personalizacionMasivaInput),
    );
  });

  it("PersonalizacionMasivaAdsAgent", async () => {
    await assertOutput("personalizacionmasiva-ads", () =>
      PersonalizacionMasivaAdsAgent.instance.run(personalizacionMasivaInput),
    );
  });

  it("PersonalizacionMasivaTimingAgent", async () => {
    await assertOutput("personalizacionmasiva-timing", () =>
      PersonalizacionMasivaTimingAgent.instance.run(personalizacionMasivaInput),
    );
  });

  it("PersonalizacionMasivaOfferAgent", async () => {
    await assertOutput("personalizacionmasiva-offer", () =>
      PersonalizacionMasivaOfferAgent.instance.run(personalizacionMasivaInput),
    );
  });

  it("PersonalizacionMasivaAnalyticsAgent", async () => {
    await assertOutput("personalizacionmasiva-analytics", () =>
      PersonalizacionMasivaAnalyticsAgent.instance.run(personalizacionMasivaInput),
    );
  });
});
