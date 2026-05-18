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
  FintechActivacionAgent,
  FintechAdquisicionAgent,
  FintechAnalyticsAgent,
  FintechEmailAgent,
  FintechPreciosAgent,
  FintechReviewsAgent,
  FintechSEOAgent,
  FintechSocialAgent,
  resetAllFintechAgentsForTests,
} from "../sectors/fintech";

const FT_JSON = JSON.stringify({
  result: "Fintech: neobanco, onboarding y métricas producto.",
  score: 93,
  recommendations: ["FTUE", "DAU cohorte", "Fees transparentes"],
});

const fintechInput = {
  userId: "00000000-0000-0000-0000-00000000ft01",
  businessName: "Fintech demo",
  services: ["cuenta", "tarjeta"],
  targets: ["retail"],
};

describe("Fintech agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(FT_JSON);
    resetAllFintechAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("FintechAdquisicionAgent", async () => {
    await assertOutput("fintech-adquisicion", () => FintechAdquisicionAgent.instance().run(fintechInput));
  });

  it("FintechActivacionAgent", async () => {
    await assertOutput("fintech-activacion", () => FintechActivacionAgent.instance().run(fintechInput));
  });

  it("FintechPreciosAgent", async () => {
    await assertOutput("fintech-precios", () => FintechPreciosAgent.instance().run(fintechInput));
  });

  it("FintechSEOAgent", async () => {
    await assertOutput("fintech-seo", () => FintechSEOAgent.instance().run(fintechInput));
  });

  it("FintechSocialAgent", async () => {
    await assertOutput("fintech-social", () => FintechSocialAgent.instance().run(fintechInput));
  });

  it("FintechEmailAgent", async () => {
    await assertOutput("fintech-email", () => FintechEmailAgent.instance().run(fintechInput));
  });

  it("FintechReviewsAgent", async () => {
    await assertOutput("fintech-reviews", () => FintechReviewsAgent.instance().run(fintechInput));
  });

  it("FintechAnalyticsAgent", async () => {
    await assertOutput("fintech-analytics", () => FintechAnalyticsAgent.instance().run(fintechInput));
  });
});
