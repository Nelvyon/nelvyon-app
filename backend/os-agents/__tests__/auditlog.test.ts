import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  AuditAlertDispatcherAgent,
  AuditAnomalyDetectorAgent,
  AuditComplianceReporterAgent,
  AuditEventCaptureAgent,
  AuditExportAgent,
  AuditRetentionManagerAgent,
  AuditRiskScorerAgent,
  AuditSessionTrackerAgent,
  resetAllAuditLogAgentsForTests,
} from "../sectors/auditlog";

const AUDIT_JSON = JSON.stringify({
  summary: "Evento dentro de baseline — sin señales de takeover.",
  riskScore: 24,
  anomalyDetected: false,
  anomalyReason: "",
});

const auditInput = {
  userId: "00000000-0000-0000-0000-00000000a111",
  actionType: "AGENT_RUN" as const,
  entityType: "workflow",
  entityId: "wf_9",
  sessionId: "sess_x",
  metadata: { lane: "premium" },
};

describe("Audit log agents", () => {
  beforeEach(() => {
    completeMock.mockReset();
    completeMock.mockResolvedValue(AUDIT_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllAuditLogAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertAuditOutput(runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { logged: boolean; auditId: string };
    expect(out.logged).toBe(true);
    expect(typeof out.auditId).toBe("string");
    expect(out.auditId.length).toBeGreaterThan(0);
  }

  it("AuditEventCaptureAgent", async () => {
    await assertAuditOutput(() => AuditEventCaptureAgent.instance.run(auditInput));
  });

  it("AuditAnomalyDetectorAgent", async () => {
    await assertAuditOutput(() => AuditAnomalyDetectorAgent.instance.run(auditInput));
  });

  it("AuditRiskScorerAgent", async () => {
    await assertAuditOutput(() => AuditRiskScorerAgent.instance.run(auditInput));
  });

  it("AuditSessionTrackerAgent", async () => {
    await assertAuditOutput(() => AuditSessionTrackerAgent.instance.run(auditInput));
  });

  it("AuditComplianceReporterAgent", async () => {
    await assertAuditOutput(() => AuditComplianceReporterAgent.instance.run(auditInput));
  });

  it("AuditRetentionManagerAgent", async () => {
    await assertAuditOutput(() => AuditRetentionManagerAgent.instance.run(auditInput));
  });

  it("AuditExportAgent", async () => {
    await assertAuditOutput(() => AuditExportAgent.instance.run(auditInput));
  });

  it("AuditAlertDispatcherAgent", async () => {
    await assertAuditOutput(() => AuditAlertDispatcherAgent.instance.run(auditInput));
  });
});
