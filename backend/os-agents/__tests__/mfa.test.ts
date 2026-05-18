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
  MfaAnomalyDetectorAgent,
  MfaComplianceCheckerAgent,
  MfaIncidentResponseAgent,
  MfaPolicyGeneratorAgent,
  MfaRecoveryFlowAgent,
  MfaRiskAssessorAgent,
  MfaSetupGuideAgent,
  MfaUserEducationAgent,
  resetAllMfaAgentsForTests,
} from "../sectors/mfa";

const MFA_JSON = JSON.stringify({
  content:
    "SECURE: Scan amenazas; Evaluate controles; Control MFA; Understand usuario; Respond IR; Enforce política.",
  score: 91,
  instructions: ["Habilitar MFA en todos los roles", "Registrar dispositivos confiables", "Revisar sesiones activas semanalmente"],
  securityTips: ["Rotar códigos backup tras uso", "No reutilizar OTP entre servicios"],
});

const mfaInput = {
  userId: "00000000-0000-0000-0000-00000000mfa1",
  sector: "healthcare",
  userEmail: "clinician@hospital.example",
  mfaMethod: "totp" as const,
  riskLevel: "high" as const,
};

describe("MFA agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(MFA_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllMfaAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertMfaOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      instructions: string[];
      securityTips: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.instructions.length).toBeGreaterThanOrEqual(1);
    expect(out.securityTips.length).toBeGreaterThanOrEqual(1);
  }

  it("MfaSetupGuideAgent", async () => {
    await assertMfaOutput("mfa-setup-guide", () => MfaSetupGuideAgent.instance.run(mfaInput));
  });

  it("MfaRiskAssessorAgent", async () => {
    await assertMfaOutput("mfa-risk-assessor", () => MfaRiskAssessorAgent.instance.run(mfaInput));
  });

  it("MfaRecoveryFlowAgent", async () => {
    await assertMfaOutput("mfa-recovery-flow", () => MfaRecoveryFlowAgent.instance.run(mfaInput));
  });

  it("MfaComplianceCheckerAgent", async () => {
    await assertMfaOutput("mfa-compliance-checker", () => MfaComplianceCheckerAgent.instance.run(mfaInput));
  });

  it("MfaUserEducationAgent", async () => {
    await assertMfaOutput("mfa-user-education", () => MfaUserEducationAgent.instance.run(mfaInput));
  });

  it("MfaAnomalyDetectorAgent", async () => {
    await assertMfaOutput("mfa-anomaly-detector", () => MfaAnomalyDetectorAgent.instance.run(mfaInput));
  });

  it("MfaPolicyGeneratorAgent", async () => {
    await assertMfaOutput("mfa-policy-generator", () => MfaPolicyGeneratorAgent.instance.run(mfaInput));
  });

  it("MfaIncidentResponseAgent", async () => {
    await assertMfaOutput("mfa-incident-response", () => MfaIncidentResponseAgent.instance.run(mfaInput));
  });
});
