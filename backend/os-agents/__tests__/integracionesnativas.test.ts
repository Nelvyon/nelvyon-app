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
  IntegracionesNativasAuditAgent,
  IntegracionesNativasGA4Agent,
  IntegracionesNativasGoogleAdsAgent,
  IntegracionesNativasMetaAgent,
  IntegracionesNativasReportAgent,
  IntegracionesNativasShopifyAgent,
  IntegracionesNativasSyncAgent,
  IntegracionesNativasTikTokAgent,
  resetAllIntegracionesNativasAgentsForTests,
} from "../sectors/integracionesnativas";

const IN_JSON = JSON.stringify({
  content:
    "IntegracionesNativas: sync RT <30s, 0% pérdida eventos, dedupe cross-plataforma, setup <5 min, ROAS unificado RT.",
  score: 94,
  highlights: ["Sync <30s", "0% pérdida", "ROAS RT"],
  metrics: ["Unified ROAS"],
});

const integracionesNativasInput = {
  userId: "00000000-0000-0000-0000-00000000in01",
  sector: "ecommerce",
  brand: "Ecommerce demo",
  integrationBrief: "GA4 · Meta · Google Ads · Shopify",
  metricsBrief: "ROAS unificado · CPA total",
};

type IntegracionesNativasOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("IntegracionesNativas agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(IN_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllIntegracionesNativasAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as IntegracionesNativasOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("IntegracionesNativasGA4Agent", async () => {
    await assertOutput("integracionesnativas-ga4", () => IntegracionesNativasGA4Agent.instance.run(integracionesNativasInput));
  });

  it("IntegracionesNativasMetaAgent", async () => {
    await assertOutput("integracionesnativas-meta", () => IntegracionesNativasMetaAgent.instance.run(integracionesNativasInput));
  });

  it("IntegracionesNativasGoogleAdsAgent", async () => {
    await assertOutput("integracionesnativas-googleads", () =>
      IntegracionesNativasGoogleAdsAgent.instance.run(integracionesNativasInput),
    );
  });

  it("IntegracionesNativasShopifyAgent", async () => {
    await assertOutput("integracionesnativas-shopify", () =>
      IntegracionesNativasShopifyAgent.instance.run(integracionesNativasInput),
    );
  });

  it("IntegracionesNativasTikTokAgent", async () => {
    await assertOutput("integracionesnativas-tiktok", () =>
      IntegracionesNativasTikTokAgent.instance.run(integracionesNativasInput),
    );
  });

  it("IntegracionesNativasSyncAgent", async () => {
    await assertOutput("integracionesnativas-sync", () => IntegracionesNativasSyncAgent.instance.run(integracionesNativasInput));
  });

  it("IntegracionesNativasAuditAgent", async () => {
    await assertOutput("integracionesnativas-audit", () =>
      IntegracionesNativasAuditAgent.instance.run(integracionesNativasInput),
    );
  });

  it("IntegracionesNativasReportAgent", async () => {
    await assertOutput("integracionesnativas-report", () =>
      IntegracionesNativasReportAgent.instance.run(integracionesNativasInput),
    );
  });
});
