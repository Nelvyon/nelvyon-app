// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getLegalAdsAgent,
  getLegalClientEmailAgent,
  getLegalConsultationNurturingAgent,
  getLegalContentMarketingAgent,
  getLegalFirmProfileAgent,
  getLegalReferralAgent,
  getLegalReputationAgent,
  getLegalSEOAgent,
  getLegalThoughtLeadershipAgent,
  LegalActualizacionAgent,
  LegalContratosAgent,
  LegalGdprAgent,
  LegalJurisdiccionAgent,
  LegalNdaAgent,
  LegalPrivacidadAgent,
  LegalSlaAgent,
  LegalTosAgent,
  resetAllLegalAgentsForTests,
  resetLegalAdsAgentForTests,
  resetLegalClientEmailAgentForTests,
  resetLegalConsultationNurturingAgentForTests,
  resetLegalContentMarketingAgentForTests,
  resetLegalFirmProfileAgentForTests,
  resetLegalReferralAgentForTests,
  resetLegalReputationAgentForTests,
  resetLegalSEOAgentForTests,
  resetLegalThoughtLeadershipAgentForTests,
} from "../sectors/legal";

const LLM_JSON = JSON.stringify({
  result: "test output",
  score: 77,
  recommendations: ["r1", "r2"],
});

const llm = {
  complete: vi.fn().mockImplementation(async () => LLM_JSON),
};

const legalOsInput = {
  userId: "00000000-0000-0000-0000-00000000le01",
  businessName: "Empresa demo",
  services: ["SaaS", "API"],
  targets: ["B2B", "UE"],
};

describe("Legal agents (marketing)", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetLegalFirmProfileAgentForTests();
    resetLegalContentMarketingAgentForTests();
    resetLegalSEOAgentForTests();
    resetLegalAdsAgentForTests();
    resetLegalClientEmailAgentForTests();
    resetLegalConsultationNurturingAgentForTests();
    resetLegalReputationAgentForTests();
    resetLegalReferralAgentForTests();
    resetLegalThoughtLeadershipAgentForTests();
  });

  const input = { firmName: "Bufete Norte", practiceArea: "laboral", targetClient: "pymes", tone: "profesional", location: "Madrid" };
  it("LegalFirmProfileAgent", async () => {
    const r = await getLegalFirmProfileAgent().run("u", input);
    expect(r.agentId).toBe("legal-firm-profile");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LegalContentMarketingAgent", async () => {
    const r = await getLegalContentMarketingAgent().run("u", input);
    expect(r.agentId).toBe("legal-content-marketing");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LegalSEOAgent", async () => {
    const r = await getLegalSEOAgent().run("u", input);
    expect(r.agentId).toBe("legal-seo");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LegalAdsAgent", async () => {
    const r = await getLegalAdsAgent().run("u", input);
    expect(r.agentId).toBe("legal-ads");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LegalClientEmailAgent", async () => {
    const r = await getLegalClientEmailAgent().run("u", input);
    expect(r.agentId).toBe("legal-client-email");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LegalConsultationNurturingAgent", async () => {
    const r = await getLegalConsultationNurturingAgent().run("u", input);
    expect(r.agentId).toBe("legal-consultation-nurturing");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LegalReputationAgent", async () => {
    const r = await getLegalReputationAgent().run("u", input);
    expect(r.agentId).toBe("legal-reputation");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LegalReferralAgent", async () => {
    const r = await getLegalReferralAgent().run("u", input);
    expect(r.agentId).toBe("legal-referral");
    expect(r.result.length).toBeGreaterThan(0);
  });
  it("LegalThoughtLeadershipAgent", async () => {
    const r = await getLegalThoughtLeadershipAgent().run("u", input);
    expect(r.agentId).toBe("legal-thought-leadership");
    expect(r.result.length).toBeGreaterThan(0);
  });
});

describe("Legal OS compliance agents (MIG 232)", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetAllLegalAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("LegalGdprAgent", async () => {
    await assertOutput("legal-gdpr", () => LegalGdprAgent.instance().run(legalOsInput));
  });
  it("LegalTosAgent", async () => {
    await assertOutput("legal-tos", () => LegalTosAgent.instance().run(legalOsInput));
  });
  it("LegalPrivacidadAgent", async () => {
    await assertOutput("legal-privacidad", () => LegalPrivacidadAgent.instance().run(legalOsInput));
  });
  it("LegalContratosAgent", async () => {
    await assertOutput("legal-contratos", () => LegalContratosAgent.instance().run(legalOsInput));
  });
  it("LegalNdaAgent", async () => {
    await assertOutput("legal-nda", () => LegalNdaAgent.instance().run(legalOsInput));
  });
  it("LegalSlaAgent", async () => {
    await assertOutput("legal-sla", () => LegalSlaAgent.instance().run(legalOsInput));
  });
  it("LegalJurisdiccionAgent", async () => {
    await assertOutput("legal-jurisdiccion", () => LegalJurisdiccionAgent.instance().run(legalOsInput));
  });
  it("LegalActualizacionAgent", async () => {
    await assertOutput("legal-actualizacion", () => LegalActualizacionAgent.instance().run(legalOsInput));
  });
});
