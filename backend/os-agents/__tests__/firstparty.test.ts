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
  FirstPartyActivacionAgent,
  FirstPartyAuditoriaAgent,
  FirstPartyCaptacionAgent,
  FirstPartyCdpAgent,
  FirstPartyEnriquecimientoAgent,
  FirstPartyPrediccionAgent,
  FirstPartyPrivacidadAgent,
  FirstPartySegmentacionAgent,
  resetAllFirstPartyAgentsForTests,
} from "../sectors/firstparty";

const FIRST_PARTY_JSON = JSON.stringify({
  result: "First-party OS: CDP ligero, segmentos y GDPR con datos propios únicamente.",
  insights: ["Unificar ID reduce duplicados", "Server-side events mejoran atribución propia"],
  recommendedActions: ["Mapa de consentimientos", "Feature store interno", "Revisión DPO"],
});

const firstPartyInput = {
  userId: "00000000-0000-0000-0000-00000000fp01",
  businessContext: "Retail EU, Shopify + CRM, reducir dependencia de pixels terceros.",
  agentId: "firstparty-auditoria",
};

describe("FirstParty agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(FIRST_PARTY_JSON);
    resetAllFirstPartyAgentsForTests();
  });

  async function assertOutput(runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { result: string; insights: string[]; recommendedActions: string[] };
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.insights.length).toBeGreaterThanOrEqual(1);
    expect(out.recommendedActions.length).toBeGreaterThanOrEqual(1);
  }

  it("FirstPartyAuditoriaAgent", async () => {
    await assertOutput(() => FirstPartyAuditoriaAgent.instance().execute(firstPartyInput));
  });
  it("FirstPartyCaptacionAgent", async () => {
    await assertOutput(() => FirstPartyCaptacionAgent.instance().execute(firstPartyInput));
  });
  it("FirstPartyCdpAgent", async () => {
    await assertOutput(() => FirstPartyCdpAgent.instance().execute(firstPartyInput));
  });
  it("FirstPartySegmentacionAgent", async () => {
    await assertOutput(() => FirstPartySegmentacionAgent.instance().execute(firstPartyInput));
  });
  it("FirstPartyActivacionAgent", async () => {
    await assertOutput(() => FirstPartyActivacionAgent.instance().execute(firstPartyInput));
  });
  it("FirstPartyPrivacidadAgent", async () => {
    await assertOutput(() => FirstPartyPrivacidadAgent.instance().execute(firstPartyInput));
  });
  it("FirstPartyEnriquecimientoAgent", async () => {
    await assertOutput(() => FirstPartyEnriquecimientoAgent.instance().execute(firstPartyInput));
  });
  it("FirstPartyPrediccionAgent", async () => {
    await assertOutput(() => FirstPartyPrediccionAgent.instance().execute(firstPartyInput));
  });
});
