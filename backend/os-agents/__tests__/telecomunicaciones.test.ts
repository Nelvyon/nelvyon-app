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
  TelecomAdquisicionAgent,
  TelecomAnalyticsAgent,
  TelecomEmailAgent,
  TelecomPreciosAgent,
  TelecomRetencionAgent,
  TelecomReviewsAgent,
  TelecomSEOAgent,
  TelecomSocialAgent,
  resetAllTelecomunicacionesAgentsForTests,
} from "../sectors/telecomunicaciones";

const TL_JSON = JSON.stringify({
  result: "Telecom: adquisición, retención, precios y analytics ARPU/LTV.",
  score: 93,
  recommendations: ["Bundle convergente", "Win-back", "Cohortes churn"],
});

const telecomunicacionesInput = {
  userId: "00000000-0000-0000-0000-00000000tl01",
  businessName: "Telecom demo",
  services: ["fibra", "móvil"],
  targets: ["hogares", "PYME"],
};

describe("Telecomunicaciones agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(TL_JSON);
    resetAllTelecomunicacionesAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("TelecomAdquisicionAgent", async () => {
    await assertOutput("telecomunicaciones-adquisicion", () => TelecomAdquisicionAgent.instance.run(telecomunicacionesInput));
  });

  it("TelecomRetencionAgent", async () => {
    await assertOutput("telecomunicaciones-retencion", () => TelecomRetencionAgent.instance.run(telecomunicacionesInput));
  });

  it("TelecomPreciosAgent", async () => {
    await assertOutput("telecomunicaciones-precios", () => TelecomPreciosAgent.instance.run(telecomunicacionesInput));
  });

  it("TelecomSEOAgent", async () => {
    await assertOutput("telecomunicaciones-seo", () => TelecomSEOAgent.instance.run(telecomunicacionesInput));
  });

  it("TelecomSocialAgent", async () => {
    await assertOutput("telecomunicaciones-social", () => TelecomSocialAgent.instance.run(telecomunicacionesInput));
  });

  it("TelecomEmailAgent", async () => {
    await assertOutput("telecomunicaciones-email", () => TelecomEmailAgent.instance.run(telecomunicacionesInput));
  });

  it("TelecomReviewsAgent", async () => {
    await assertOutput("telecomunicaciones-reviews", () => TelecomReviewsAgent.instance.run(telecomunicacionesInput));
  });

  it("TelecomAnalyticsAgent", async () => {
    await assertOutput("telecomunicaciones-analytics", () => TelecomAnalyticsAgent.instance.run(telecomunicacionesInput));
  });
});
