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
  PartnershipAfiliadosAgent,
  PartnershipComarketingAgent,
  PartnershipEcosistemaAgent,
  PartnershipIdentificacionAgent,
  PartnershipIntegracionesAgent,
  PartnershipOnboardingAgent,
  PartnershipPropuestaAgent,
  PartnershipTrackingAgent,
  resetAllPartnershipAgentsForTests,
} from "../sectors/partnership";

const PARTNERSHIP_JSON = JSON.stringify({
  result: "Partnership OS: integraciones, co-marketing y tracking revenue con gobernanza.",
  score: 88,
  recommendations: ["NDA temprano", "SLA uptime", "Revisión legal claims"],
});

const partnershipInput = {
  userId: "00000000-0000-0000-0000-00000000pt01",
  businessName: "Negocio demo",
  services: ["PartnerStack", "Salesforce"],
  targets: ["ISV", "EU"],
  metadata: { program: "partnership_v1" },
};

describe("Partnership agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(PARTNERSHIP_JSON);
    resetAllPartnershipAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("PartnershipIdentificacionAgent", async () => {
    await assertOutput("partnership-identificacion", () => PartnershipIdentificacionAgent.instance().run(partnershipInput));
  });
  it("PartnershipPropuestaAgent", async () => {
    await assertOutput("partnership-propuesta", () => PartnershipPropuestaAgent.instance().run(partnershipInput));
  });
  it("PartnershipAfiliadosAgent", async () => {
    await assertOutput("partnership-afiliados", () => PartnershipAfiliadosAgent.instance().run(partnershipInput));
  });
  it("PartnershipIntegracionesAgent", async () => {
    await assertOutput("partnership-integraciones", () => PartnershipIntegracionesAgent.instance().run(partnershipInput));
  });
  it("PartnershipComarketingAgent", async () => {
    await assertOutput("partnership-comarketing", () => PartnershipComarketingAgent.instance().run(partnershipInput));
  });
  it("PartnershipTrackingAgent", async () => {
    await assertOutput("partnership-tracking", () => PartnershipTrackingAgent.instance().run(partnershipInput));
  });
  it("PartnershipOnboardingAgent", async () => {
    await assertOutput("partnership-onboarding", () => PartnershipOnboardingAgent.instance().run(partnershipInput));
  });
  it("PartnershipEcosistemaAgent", async () => {
    await assertOutput("partnership-ecosistema", () => PartnershipEcosistemaAgent.instance().run(partnershipInput));
  });
});
