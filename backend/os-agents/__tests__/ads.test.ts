// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const dbMock = { query: queryMock };

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => dbMock,
  },
}));

const llmMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: llmMock }),
  },
}));

import {
  AdsAttributionAgent,
  AdsAudienciasAgent,
  AdsCreatividadesAgent,
  AdsEstrategiaAgent,
  AdsGoogleAgent,
  AdsMetaAgent,
  AdsOptimizacionAgent,
  AdsTiktokAgent,
  resetAllAdsAgentsForTests,
} from "../sectors/ads";

const ADS_JSON = JSON.stringify({
  result: "Ads OS: plan omnicanal con ROAS, audiencias y rotación creativa medibles.",
  insights: ["Smart Bidding requiere conversiones limpias", "LAL desde compradores reduce CPA"],
  recommendedActions: ["Consolidar eventos CAPI", "Matriz creatividad × etapa", "Test incrementality trimestral"],
});

const adsInput = {
  userId: "00000000-0000-0000-0000-00000000ads1",
  businessContext: "Lead gen B2B SaaS: Google Search + Meta remarketing, ticket medio 4k€, ventana atribución 30d.",
  agentId: "ads-estrategia",
};

describe("Ads agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(ADS_JSON);
    resetAllAdsAgentsForTests();
  });

  async function assertOutput(runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { result: string; insights: string[]; recommendedActions: string[] };
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.insights.length).toBeGreaterThanOrEqual(1);
    expect(out.recommendedActions.length).toBeGreaterThanOrEqual(1);
  }

  it("AdsEstrategiaAgent", async () => {
    await assertOutput(() => AdsEstrategiaAgent.instance().execute(adsInput));
  });
  it("AdsGoogleAgent", async () => {
    await assertOutput(() => AdsGoogleAgent.instance().execute(adsInput));
  });
  it("AdsMetaAgent", async () => {
    await assertOutput(() => AdsMetaAgent.instance().execute(adsInput));
  });
  it("AdsTiktokAgent", async () => {
    await assertOutput(() => AdsTiktokAgent.instance().execute(adsInput));
  });
  it("AdsAudienciasAgent", async () => {
    await assertOutput(() => AdsAudienciasAgent.instance().execute(adsInput));
  });
  it("AdsCreatividadesAgent", async () => {
    await assertOutput(() => AdsCreatividadesAgent.instance().execute(adsInput));
  });
  it("AdsAttributionAgent", async () => {
    await assertOutput(() => AdsAttributionAgent.instance().execute(adsInput));
  });
  it("AdsOptimizacionAgent", async () => {
    await assertOutput(() => AdsOptimizacionAgent.instance().execute(adsInput));
  });
});
