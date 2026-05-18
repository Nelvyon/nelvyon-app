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
  AccessControlAgent,
  BAAAgreementAgent,
  BreachDetectionAgent,
  HipaaAuditAgent,
  HipaaReportingAgent,
  HipaaTrainingAgent,
  PHIDetectionAgent,
  PHIEncryptionAgent,
  resetAllHipaaComplianceAgentsForTests,
} from "../sectors/hipaacompliance";

const HC_JSON = JSON.stringify({
  content:
    "HIPAA: PHI <1 s cifrado, auditoría <10 min, brecha <1 h, 0 PHI claro, BAA auto, compliance >99%.",
  score: 96,
  highlights: ["PHI <1 s", "Audit <10 min", ">99% compliance"],
  metrics: ["Compliance score"],
});

const hipaaComplianceInput = {
  userId: "00000000-0000-0000-0000-00000000hc01",
  sector: "healthcare",
  brand: "Clínica demo",
  hipaaComplianceBrief: "HIPAA compliance · PHI",
  metricsBrief: "PHI · auditoría · brechas",
};

type HipaaComplianceOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("HipaaCompliance agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(HC_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllHipaaComplianceAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as HipaaComplianceOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("HipaaAuditAgent", async () => {
    await assertOutput("hipaacompliance-hipaaaudit", () => HipaaAuditAgent.instance.run(hipaaComplianceInput));
  });

  it("PHIDetectionAgent", async () => {
    await assertOutput("hipaacompliance-phidetection", () => PHIDetectionAgent.instance.run(hipaaComplianceInput));
  });

  it("PHIEncryptionAgent", async () => {
    await assertOutput("hipaacompliance-phiencryption", () => PHIEncryptionAgent.instance.run(hipaaComplianceInput));
  });

  it("AccessControlAgent", async () => {
    await assertOutput("hipaacompliance-accesscontrol", () => AccessControlAgent.instance.run(hipaaComplianceInput));
  });

  it("BreachDetectionAgent", async () => {
    await assertOutput("hipaacompliance-breachdetection", () =>
      BreachDetectionAgent.instance.run(hipaaComplianceInput),
    );
  });

  it("BAAAgreementAgent", async () => {
    await assertOutput("hipaacompliance-baaagreement", () => BAAAgreementAgent.instance.run(hipaaComplianceInput));
  });

  it("HipaaTrainingAgent", async () => {
    await assertOutput("hipaacompliance-hipaatraining", () => HipaaTrainingAgent.instance.run(hipaaComplianceInput));
  });

  it("HipaaReportingAgent", async () => {
    await assertOutput("hipaacompliance-hipaareporting", () => HipaaReportingAgent.instance.run(hipaaComplianceInput));
  });
});
