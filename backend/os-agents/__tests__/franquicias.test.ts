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
  FranquiciasAnalyticsAgent,
  FranquiciasEmailAgent,
  FranquiciasExpansionAgent,
  FranquiciasMarketingLocalAgent,
  FranquiciasPreciosAgent,
  FranquiciasReviewsAgent,
  FranquiciasSEOAgent,
  FranquiciasSocialAgent,
  resetAllFranquiciasAgentsForTests,
} from "../sectors/franquicias";

const FQ_JSON = JSON.stringify({
  result: "Franquicias: expansión, marketing local, SEO red y analytics.",
  score: 93,
  recommendations: ["Discovery day", "Kit marketing local", "Ranking unidades"],
});

const franquiciasInput = {
  userId: "00000000-0000-0000-0000-00000000fq01",
  businessName: "Franquicia demo",
  services: ["formación", "marketing central"],
  targets: ["franquiciados", "expansión nacional"],
};

describe("Franquicias agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(FQ_JSON);
    resetAllFranquiciasAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("FranquiciasExpansionAgent", async () => {
    await assertOutput("franquicias-expansion", () => FranquiciasExpansionAgent.instance.run(franquiciasInput));
  });

  it("FranquiciasMarketingLocalAgent", async () => {
    await assertOutput("franquicias-marketinglocal", () => FranquiciasMarketingLocalAgent.instance.run(franquiciasInput));
  });

  it("FranquiciasPreciosAgent", async () => {
    await assertOutput("franquicias-precios", () => FranquiciasPreciosAgent.instance.run(franquiciasInput));
  });

  it("FranquiciasSEOAgent", async () => {
    await assertOutput("franquicias-seo", () => FranquiciasSEOAgent.instance.run(franquiciasInput));
  });

  it("FranquiciasSocialAgent", async () => {
    await assertOutput("franquicias-social", () => FranquiciasSocialAgent.instance.run(franquiciasInput));
  });

  it("FranquiciasEmailAgent", async () => {
    await assertOutput("franquicias-email", () => FranquiciasEmailAgent.instance.run(franquiciasInput));
  });

  it("FranquiciasReviewsAgent", async () => {
    await assertOutput("franquicias-reviews", () => FranquiciasReviewsAgent.instance.run(franquiciasInput));
  });

  it("FranquiciasAnalyticsAgent", async () => {
    await assertOutput("franquicias-analytics", () => FranquiciasAnalyticsAgent.instance.run(franquiciasInput));
  });
});
