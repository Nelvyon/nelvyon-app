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
  CustomerJourneyFriccionAgent,
  CustomerJourneyMapeoAgent,
  CustomerJourneyMetricasAgent,
  CustomerJourneyNurturingAgent,
  CustomerJourneyOmnichannelAgent,
  CustomerJourneyOptimizadorAgent,
  CustomerJourneyPersonalizacionAgent,
  CustomerJourneyRecuperacionAgent,
  resetAllCustomerJourneyAgentsForTests,
} from "../sectors/customerjourney";

const CUSTOMER_JOURNEY_JSON = JSON.stringify({
  result: "Customer journey OS: mapeo omnicanal, métricas por etapa y nurturing con consentimiento.",
  score: 88,
  recommendations: ["Unificar ID", "Supresión cruzada", "Evitar dark patterns"],
});

const customerJourneyInput = {
  userId: "00000000-0000-0000-0000-00000000cj01",
  businessName: "Negocio demo",
  services: ["HubSpot", "Segment"],
  targets: ["EU", "trial 14d"],
  metadata: { program: "customerjourney_v1" },
};

describe("CustomerJourney agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(CUSTOMER_JOURNEY_JSON);
    resetAllCustomerJourneyAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("CustomerJourneyMapeoAgent", async () => {
    await assertOutput("customerjourney-mapeo", () => CustomerJourneyMapeoAgent.instance().run(customerJourneyInput));
  });
  it("CustomerJourneyFriccionAgent", async () => {
    await assertOutput("customerjourney-friccion", () => CustomerJourneyFriccionAgent.instance().run(customerJourneyInput));
  });
  it("CustomerJourneyPersonalizacionAgent", async () => {
    await assertOutput("customerjourney-personalizacion", () => CustomerJourneyPersonalizacionAgent.instance().run(customerJourneyInput));
  });
  it("CustomerJourneyNurturingAgent", async () => {
    await assertOutput("customerjourney-nurturing", () => CustomerJourneyNurturingAgent.instance().run(customerJourneyInput));
  });
  it("CustomerJourneyRecuperacionAgent", async () => {
    await assertOutput("customerjourney-recuperacion", () => CustomerJourneyRecuperacionAgent.instance().run(customerJourneyInput));
  });
  it("CustomerJourneyMetricasAgent", async () => {
    await assertOutput("customerjourney-metricas", () => CustomerJourneyMetricasAgent.instance().run(customerJourneyInput));
  });
  it("CustomerJourneyOptimizadorAgent", async () => {
    await assertOutput("customerjourney-optimizador", () => CustomerJourneyOptimizadorAgent.instance().run(customerJourneyInput));
  });
  it("CustomerJourneyOmnichannelAgent", async () => {
    await assertOutput("customerjourney-omnichannel", () => CustomerJourneyOmnichannelAgent.instance().run(customerJourneyInput));
  });
});
