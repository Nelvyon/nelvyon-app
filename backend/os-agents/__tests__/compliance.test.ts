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
  ComplianceControlMapperAgent,
  ComplianceEvidenceCheckerAgent,
  ComplianceGapAnalyzerAgent,
  ComplianceIncidentPlanAgent,
  CompliancePolicyDrafterAgent,
  ComplianceReadinessReportAgent,
  ComplianceRiskRegisterAgent,
  ComplianceVendorAssessorAgent,
  resetAllComplianceAgentsForTests,
} from "../sectors/compliance";

const COMPLIANCE_JSON = JSON.stringify({
  content:
    "COMPLY: Controls baseline; Obligations framework; Map evidencias; Protect proporcional; Log retención; Yield roadmap.",
  score: 89,
  controls: ["CC6.1 segmentación red documentada", "A.5.2 política acceso aprobada"],
  gaps: ["Pentest externo vencido", "Vendor subprocessors sin registro actualizado"],
});

const complianceInput = {
  userId: "00000000-0000-0000-0000-00000000c0mp",
  sector: "fintech",
  framework: "SOC 2 Type II + ISO 27001:2022",
  currentControls: ["MFA Okta", "SIEM 90d"],
  dataTypes: ["PII", "pagos tokenizados"],
  region: "US-EU",
};

describe("Compliance agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(COMPLIANCE_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllComplianceAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertComplianceOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      controls: string[];
      gaps: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.controls.length).toBeGreaterThanOrEqual(1);
    expect(out.gaps.length).toBeGreaterThanOrEqual(1);
  }

  it("ComplianceGapAnalyzerAgent", async () => {
    await assertComplianceOutput("compliance-gap-analyzer", () => ComplianceGapAnalyzerAgent.instance.run(complianceInput));
  });

  it("ComplianceControlMapperAgent", async () => {
    await assertComplianceOutput("compliance-control-mapper", () => ComplianceControlMapperAgent.instance.run(complianceInput));
  });

  it("CompliancePolicyDrafterAgent", async () => {
    await assertComplianceOutput("compliance-policy-drafter", () => CompliancePolicyDrafterAgent.instance.run(complianceInput));
  });

  it("ComplianceRiskRegisterAgent", async () => {
    await assertComplianceOutput("compliance-risk-register", () => ComplianceRiskRegisterAgent.instance.run(complianceInput));
  });

  it("ComplianceEvidenceCheckerAgent", async () => {
    await assertComplianceOutput("compliance-evidence-checker", () => ComplianceEvidenceCheckerAgent.instance.run(complianceInput));
  });

  it("ComplianceVendorAssessorAgent", async () => {
    await assertComplianceOutput("compliance-vendor-assessor", () => ComplianceVendorAssessorAgent.instance.run(complianceInput));
  });

  it("ComplianceIncidentPlanAgent", async () => {
    await assertComplianceOutput("compliance-incident-plan", () => ComplianceIncidentPlanAgent.instance.run(complianceInput));
  });

  it("ComplianceReadinessReportAgent", async () => {
    await assertComplianceOutput("compliance-readiness-report", () => ComplianceReadinessReportAgent.instance.run(complianceInput));
  });
});
