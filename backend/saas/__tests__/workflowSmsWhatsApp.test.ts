/**
 * Tests for send_sms and send_whatsapp workflow action types.
 * Mocks SaasSmsService and SaasWhatsAppService so no real Twilio calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const smsSendMock = vi.fn();
const waSendMock = vi.fn();

vi.mock("../SaasSmsService", () => ({
  getSaasSmsService: () => ({ send: smsSendMock }),
  SaasSmsError: class SaasSmsError extends Error {
    constructor(message: string, public code: string) { super(message); }
  },
}));

vi.mock("../SaasWhatsAppService", () => ({
  getSaasWhatsAppService: () => ({ send: waSendMock }),
  SaasWhatsAppError: class SaasWhatsAppError extends Error {
    constructor(message: string, public code: string) { super(message); }
  },
}));

vi.mock("../../email/sesClient", () => ({
  getSesClient: () => ({ send: vi.fn().mockResolvedValue({}) }),
}));
vi.mock("@aws-sdk/client-ses", () => ({
  SendEmailCommand: vi.fn().mockImplementation((input: unknown) => input),
}));

import { SaasWorkflowService } from "../SaasWorkflowService";
import { SaasCrmService } from "../SaasCrmService";

const TENANT = "t-sms-wa";
const now = new Date();

function makeWorkflowRow(actions: Record<string, unknown>[]) {
  return {
    id: "wf1", tenant_id: TENANT, name: "SMS/WA Test",
    description: null, status: "active",
    trigger_type: "manual", trigger_config: {}, conditions: [], actions,
    run_count: 0, last_run_at: null, created_at: now, updated_at: now,
  };
}

const runRow = {
  id: "run1", workflow_id: "wf1", tenant_id: TENANT,
  trigger_data: {}, status: "running",
  steps_executed: [], error: null,
  started_at: now, completed_at: null,
};

const completedRunRow = { ...runRow, status: "completed", completed_at: now };

function makeDb(workflowRow: Record<string, unknown>) {
  let callCount = 0;
  return {
    query: vi.fn(async (sql: string) => {
      callCount++;
      // SELECT workflow
      if (sql.includes("FROM saas_workflows") && sql.includes("WHERE tenant_id")) return [workflowRow];
      // INSERT run
      if (sql.includes("INSERT INTO saas_workflow_runs")) return [runRow];
      // SELECT run for getWorkflowRuns at the end
      if (sql.includes("FROM saas_workflow_runs") && sql.includes("WHERE workflow_id")) return [completedRunRow];
      // UPDATE run / workflow
      if (sql.includes("UPDATE saas_workflow_runs") || sql.includes("UPDATE saas_workflows")) return [];
      // Activity log
      if (sql.includes("INSERT INTO saas_activity_log")) return [];
      return [];
    }),
    _calls: () => callCount,
  };
}

describe("WorkflowAction send_sms", () => {
  beforeEach(() => { smsSendMock.mockReset(); waSendMock.mockReset(); });

  it("calls SaasSmsService.send with literal phone", async () => {
    smsSendMock.mockResolvedValue({ ok: true, messageSid: "SM123" });
    const wfRow = makeWorkflowRow([
      { type: "send_sms", config: { to: "+34612345678", body: "Hola desde workflow" } },
    ]);
    const db = makeDb(wfRow);
    const crm = new SaasCrmService(db as never);
    const svc = new SaasWorkflowService(db as never, crm);
    await svc.executeWorkflow("wf1", TENANT, {});
    expect(smsSendMock).toHaveBeenCalledWith(TENANT, "+34612345678", "Hola desde workflow");
  });

  it("resolves {{contact.phone}} placeholder from triggerData", async () => {
    smsSendMock.mockResolvedValue({ ok: true, messageSid: "SM456" });
    const wfRow = makeWorkflowRow([
      { type: "send_sms", config: { to: "{{contact.phone}}", body: "Tu cita confirmada" } },
    ]);
    const db = makeDb(wfRow);
    const crm = new SaasCrmService(db as never);
    const svc = new SaasWorkflowService(db as never, crm);
    await svc.executeWorkflow("wf1", TENANT, { contact: { phone: "+34699000111", id: "c1" } });
    expect(smsSendMock).toHaveBeenCalledWith(TENANT, "+34699000111", "Tu cita confirmada");
  });

  it("stores ok=false in steps_executed when SMS service throws", async () => {
    smsSendMock.mockRejectedValue(new Error("Twilio not configured"));
    const wfRow = makeWorkflowRow([
      { type: "send_sms", config: { to: "+34600000000", body: "test" } },
    ]);
    const db = makeDb(wfRow);
    const crm = new SaasCrmService(db as never);
    const svc = new SaasWorkflowService(db as never, crm);
    // Should not throw — error captured in stepsExecuted
    await expect(svc.executeWorkflow("wf1", TENANT, {})).resolves.toBeDefined();
    // Verify UPDATE was called with steps containing ok:false
    const updateCalls = (db.query.mock.calls as Array<[string, unknown[]]>)
      .filter(([sql]) => sql.includes("UPDATE saas_workflow_runs") && sql.includes("steps_executed"));
    const stepsArg = updateCalls[0]?.[1]?.[1] as Array<{ action: string; ok: boolean }> | undefined;
    expect(stepsArg?.[0]?.ok).toBe(false);
  });
});

describe("WorkflowAction send_whatsapp", () => {
  beforeEach(() => { smsSendMock.mockReset(); waSendMock.mockReset(); });

  it("calls SaasWhatsAppService.send with literal phone", async () => {
    waSendMock.mockResolvedValue({ status: "sent", twilioSid: "WA123" });
    const wfRow = makeWorkflowRow([
      { type: "send_whatsapp", config: { to: "+34612345678", body: "Hola por WA" } },
    ]);
    const db = makeDb(wfRow);
    const crm = new SaasCrmService(db as never);
    const svc = new SaasWorkflowService(db as never, crm);
    await svc.executeWorkflow("wf1", TENANT, {});
    expect(waSendMock).toHaveBeenCalledWith(TENANT, { to: "+34612345678", body: "Hola por WA" });
  });

  it("resolves {{contact.phone}} placeholder", async () => {
    waSendMock.mockResolvedValue({ status: "sent", twilioSid: "WA456" });
    const wfRow = makeWorkflowRow([
      { type: "send_whatsapp", config: { to: "{{contact.phone}}", body: "Tu pedido está listo" } },
    ]);
    const db = makeDb(wfRow);
    const crm = new SaasCrmService(db as never);
    const svc = new SaasWorkflowService(db as never, crm);
    await svc.executeWorkflow("wf1", TENANT, { contact: { phone: "+34699888777", id: "c1" } });
    expect(waSendMock).toHaveBeenCalledWith(TENANT, { to: "+34699888777", body: "Tu pedido está listo" });
  });

  it("captures error without throwing when WhatsApp service fails", async () => {
    waSendMock.mockRejectedValue(new Error("WA not configured"));
    const wfRow = makeWorkflowRow([
      { type: "send_whatsapp", config: { to: "+34600000000", body: "test" } },
    ]);
    const db = makeDb(wfRow);
    const crm = new SaasCrmService(db as never);
    const svc = new SaasWorkflowService(db as never, crm);
    await expect(svc.executeWorkflow("wf1", TENANT, {})).resolves.toBeDefined();
  });
});
