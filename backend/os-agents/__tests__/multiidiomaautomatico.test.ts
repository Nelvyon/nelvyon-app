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
  MultiIdiomaAnalyticsAgent,
  MultiIdiomaCalidadAgent,
  MultiIdiomaDetectorAgent,
  MultiIdiomaEmailAgent,
  MultiIdiomaLegalAgent,
  MultiIdiomaLocalizadorAgent,
  MultiIdiomaSEOAgent,
  MultiIdiomaTraductorAgent,
  resetAllMultiIdiomaAutomaticoAgentsForTests,
} from "../sectors/multiidiomaautomatico";

const MIA_JSON = JSON.stringify({
  content:
    "MultiIdiomaAutomatico: 40+ idiomas <5s, hreflang auto, calidad >95, detección <50ms, 0% literal sin contexto.",
  score: 96,
  highlights: ["40+ idiomas", "Hreflang auto", ">95 calidad"],
  metrics: ["Translation quality"],
});

const multiIdiomaAutomaticoInput = {
  userId: "00000000-0000-0000-0000-00000000mia1",
  sector: "global",
  brand: "Global demo",
  localeBrief: "40+ idiomas · hreflang",
  metricsBrief: "Calidad traducción · conversión por mercado",
};

type MultiIdiomaAutomaticoOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("MultiIdiomaAutomatico agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(MIA_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllMultiIdiomaAutomaticoAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as MultiIdiomaAutomaticoOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("MultiIdiomaTraductorAgent", async () => {
    await assertOutput("multiidiomaautomatico-traductor", () =>
      MultiIdiomaTraductorAgent.instance.run(multiIdiomaAutomaticoInput),
    );
  });

  it("MultiIdiomaLocalizadorAgent", async () => {
    await assertOutput("multiidiomaautomatico-localizador", () =>
      MultiIdiomaLocalizadorAgent.instance.run(multiIdiomaAutomaticoInput),
    );
  });

  it("MultiIdiomaSEOAgent", async () => {
    await assertOutput("multiidiomaautomatico-seo", () => MultiIdiomaSEOAgent.instance.run(multiIdiomaAutomaticoInput));
  });

  it("MultiIdiomaDetectorAgent", async () => {
    await assertOutput("multiidiomaautomatico-detector", () =>
      MultiIdiomaDetectorAgent.instance.run(multiIdiomaAutomaticoInput),
    );
  });

  it("MultiIdiomaCalidadAgent", async () => {
    await assertOutput("multiidiomaautomatico-calidad", () =>
      MultiIdiomaCalidadAgent.instance.run(multiIdiomaAutomaticoInput),
    );
  });

  it("MultiIdiomaEmailAgent", async () => {
    await assertOutput("multiidiomaautomatico-email", () =>
      MultiIdiomaEmailAgent.instance.run(multiIdiomaAutomaticoInput),
    );
  });

  it("MultiIdiomaLegalAgent", async () => {
    await assertOutput("multiidiomaautomatico-legal", () =>
      MultiIdiomaLegalAgent.instance.run(multiIdiomaAutomaticoInput),
    );
  });

  it("MultiIdiomaAnalyticsAgent", async () => {
    await assertOutput("multiidiomaautomatico-analytics", () =>
      MultiIdiomaAnalyticsAgent.instance.run(multiIdiomaAutomaticoInput),
    );
  });
});
