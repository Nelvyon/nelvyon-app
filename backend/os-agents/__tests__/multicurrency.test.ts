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
  MultiCurrencyBillingAgent,
  MultiCurrencyConverterAgent,
  MultiCurrencyDetectorAgent,
  MultiCurrencyDisplayAgent,
  MultiCurrencyPricingAgent,
  MultiCurrencyRateUpdaterAgent,
  MultiCurrencyReportAgent,
  MultiCurrencyRiskAgent,
  resetAllMultiCurrencyAgentsForTests,
} from "../sectors/multicurrency";

const MC_JSON = JSON.stringify({
  content:
    "Multi-moneda: base EUR 47/197/497; FX simulado; ARS riesgo → USD; reporting EUR interno.",
  score: 91,
  highlights: ["EUR 2 dec", "LATAM entero", "Redis tasas"],
  metrics: ["USD cobro si ARS/VES"],
});

const multicurrencyInput = {
  userId: "00000000-0000-0000-0000-00000000mc01",
  sector: "saas",
  brand: "WorkspaceDemo",
  countryCode: "AR",
  preferredCurrency: "ARS" as const,
  targetCurrency: "USD" as const,
  locale: "es-AR",
  metricsBrief: "Renovar Pro 197€ base",
};

type MultiCurrencyOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("MultiCurrency agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(MC_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllMultiCurrencyAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as MultiCurrencyOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("MultiCurrencyDetectorAgent", async () => {
    await assertOutput("multicurrency-detector", () => MultiCurrencyDetectorAgent.instance.run(multicurrencyInput));
  });

  it("MultiCurrencyConverterAgent", async () => {
    await assertOutput("multicurrency-converter", () => MultiCurrencyConverterAgent.instance.run(multicurrencyInput));
  });

  it("MultiCurrencyPricingAgent", async () => {
    await assertOutput("multicurrency-pricing", () => MultiCurrencyPricingAgent.instance.run(multicurrencyInput));
  });

  it("MultiCurrencyDisplayAgent", async () => {
    await assertOutput("multicurrency-display", () => MultiCurrencyDisplayAgent.instance.run(multicurrencyInput));
  });

  it("MultiCurrencyBillingAgent", async () => {
    await assertOutput("multicurrency-billing", () => MultiCurrencyBillingAgent.instance.run(multicurrencyInput));
  });

  it("MultiCurrencyRateUpdaterAgent", async () => {
    await assertOutput("multicurrency-rate-updater", () => MultiCurrencyRateUpdaterAgent.instance.run(multicurrencyInput));
  });

  it("MultiCurrencyReportAgent", async () => {
    await assertOutput("multicurrency-report", () => MultiCurrencyReportAgent.instance.run(multicurrencyInput));
  });

  it("MultiCurrencyRiskAgent", async () => {
    await assertOutput("multicurrency-risk", () => MultiCurrencyRiskAgent.instance.run(multicurrencyInput));
  });
});
