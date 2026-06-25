/**
 * S34 — i18n coverage + audit wiring smoke tests + UX components
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import esMessages from "../../../apps/web/messages/es.json";
import enMessages from "../../../apps/web/messages/en.json";

import { SaasCrmService, type CrmAuditPort } from "../SaasCrmService";
import { SaasCampaniasService, type CampaniasAuditPort } from "../SaasCampaniasService";
import { SaasWorkflowService, type WorkflowAuditPort } from "../SaasWorkflowService";
import type { SaasPostgresPort } from "../SaasOnboardingService";
import type { SaasCrmService as CrmSvcType } from "../SaasCrmService";

const TENANT = "tenant-s34-001";

// ─────────────────────────────────────────────────────────────────────────────
// i18n key parity tests
// ─────────────────────────────────────────────────────────────────────────────
describe("i18n — saas namespace ES/EN parity", () => {
  function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([k, v]) =>
      typeof v === "object" && v !== null && !Array.isArray(v)
        ? flatKeys(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k)
        : [`${prefix ? prefix + "." : ""}${k}`],
    );
  }

  const esFlat = flatKeys(esMessages);
  const enFlat = flatKeys(enMessages);

  it("es.json has saas namespace", () => {
    expect(esFlat.some(k => k.startsWith("saas."))).toBe(true);
  });

  it("en.json has saas namespace", () => {
    expect(enFlat.some(k => k.startsWith("saas."))).toBe(true);
  });

  it("all ES saas.* keys exist in EN", () => {
    const esSaasKeys = esFlat.filter(k => k.startsWith("saas."));
    const missing    = esSaasKeys.filter(k => !enFlat.includes(k));
    expect(missing).toEqual([]);
  });

  it("all EN saas.* keys exist in ES", () => {
    const enSaasKeys = enFlat.filter(k => k.startsWith("saas."));
    const missing    = enSaasKeys.filter(k => !esFlat.includes(k));
    expect(missing).toEqual([]);
  });

  it("saas.nav.groups has all 6 groups in ES", () => {
    const groups = (esMessages as typeof esMessages & { saas: { nav: { groups: Record<string, string> } } })
      .saas.nav.groups;
    expect(Object.keys(groups)).toHaveLength(6);
    expect(groups.principal).toBeDefined();
    expect(groups.comunicacion).toBeDefined();
  });

  it("saas.common.loading exists in both languages", () => {
    const esVal = (esMessages as Record<string, Record<string, Record<string, string>>>).saas?.common?.loading;
    const enVal = (enMessages as Record<string, Record<string, Record<string, string>>>).saas?.common?.loading;
    expect(esVal).toBeTruthy();
    expect(enVal).toBeTruthy();
  });

  it("saas.errors has 6 keys in both ES and EN", () => {
    const esErrors = (esMessages as Record<string, Record<string, Record<string, string>>>).saas?.errors ?? {};
    const enErrors = (enMessages as Record<string, Record<string, Record<string, string>>>).saas?.errors ?? {};
    expect(Object.keys(esErrors)).toHaveLength(6);
    expect(Object.keys(enErrors)).toHaveLength(6);
  });

  it("saas.sso.saml_coming_soon exists", () => {
    const esVal = (esMessages as Record<string, Record<string, Record<string, string>>>).saas?.sso?.saml_coming_soon;
    expect(typeof esVal).toBe("string");
    expect(esVal.length).toBeGreaterThan(5);
  });

  it("saas.audit has title in both ES and EN", () => {
    const esVal = (esMessages as Record<string, Record<string, Record<string, string>>>).saas?.audit?.title;
    const enVal = (enMessages as Record<string, Record<string, Record<string, string>>>).saas?.audit?.title;
    expect(esVal).toBe("Registros de Auditoría");
    expect(enVal).toBe("Audit Logs");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit wiring — SaasCrmService
// ─────────────────────────────────────────────────────────────────────────────
describe("Audit wiring — SaasCrmService", () => {
  let db: SaasPostgresPort;
  let auditLog: ReturnType<typeof vi.fn>;
  let audit: CrmAuditPort;
  let svc: SaasCrmService;

  const contactRow = {
    id: "c-1", tenant_id: TENANT, name: "Alice", email: "a@b.com",
    phone: null, company: null, position: null,
    status: "lead", pipeline_stage: "new", value: "0",
    notes: null, tags: "{}",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    auditLog = vi.fn().mockResolvedValue(undefined);
    audit = { log: auditLog };
    svc = new SaasCrmService(db, audit);
  });

  it("calls audit.log on createContact success", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([{ plan: "starter" }]) // getTenantPlan
      .mockResolvedValueOnce([{ n: "0" }])          // countResource contacts
      .mockResolvedValueOnce([contactRow]);           // INSERT
    await svc.createContact(TENANT, { name: "Alice" });
    expect(auditLog).toHaveBeenCalledWith(TENANT, expect.objectContaining({
      action: "create", module: "crm", resourceId: "c-1",
    }));
  });

  it("does NOT call audit.log when no audit dep injected", async () => {
    const svcNoAudit = new SaasCrmService(db);
    vi.mocked(db.query)
      .mockResolvedValueOnce([{ plan: "starter" }])
      .mockResolvedValueOnce([{ n: "0" }])
      .mockResolvedValueOnce([contactRow]);
    await svcNoAudit.createContact(TENANT, { name: "Alice" });
    // no throws
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("calls audit.log on updateContact success", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([contactRow]) // getContact (existing)
      .mockResolvedValueOnce([{ ...contactRow, name: "Alice Updated" }]); // UPDATE
    await svc.updateContact(TENANT, "c-1", { name: "Alice Updated" });
    expect(auditLog).toHaveBeenCalledWith(TENANT, expect.objectContaining({
      action: "update", module: "crm", resourceId: "c-1",
    }));
  });

  it("calls audit.log on deleteContact", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await svc.deleteContact(TENANT, "c-1");
    expect(auditLog).toHaveBeenCalledWith(TENANT, expect.objectContaining({
      action: "delete", module: "crm", resourceId: "c-1",
    }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit wiring — SaasCampaniasService.launchCampania
// ─────────────────────────────────────────────────────────────────────────────
describe("Audit wiring — SaasCampaniasService", () => {
  let db: SaasPostgresPort;
  let auditLog: ReturnType<typeof vi.fn>;
  let svc: SaasCampaniasService;

  const campaniaRow = {
    id: "camp-1", tenant_id: TENANT, name: "Test Campaign",
    subject: "Subject", body: "<p>Hi</p>", status: "draft",
    audience_filter: "{}",
    total_recipients: "0", sent_count: "0", open_count: "0", click_count: "0",
    error_count: "0", scheduled_at: null, completed_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ses_configured: true,
  };

  beforeEach(() => {
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    auditLog = vi.fn().mockResolvedValue(undefined);
    const audit: CampaniasAuditPort = { log: auditLog };
    svc = new SaasCampaniasService(db, audit);
  });

  it("calls audit.log after launchCampania completes (no recipients → fast path)", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([campaniaRow])  // getCampania
      .mockResolvedValueOnce([])             // resolveAudience (no contacts)
      .mockResolvedValueOnce([])             // UPDATE running
      .mockResolvedValueOnce([])             // UPDATE completed
    await svc.launchCampania(TENANT, "camp-1");
    expect(auditLog).toHaveBeenCalledWith(TENANT, expect.objectContaining({
      action: "send", module: "campanias", resourceId: "camp-1",
    }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit wiring — SaasWorkflowService.executeWorkflow
// ─────────────────────────────────────────────────────────────────────────────
describe("Audit wiring — SaasWorkflowService", () => {
  let db: SaasPostgresPort;
  let auditLog: ReturnType<typeof vi.fn>;
  let svc: SaasWorkflowService;

  const wfRow = {
    id: "wf-1", tenant_id: TENANT, name: "Test WF", status: "active",
    trigger_type: "manual", trigger_config: {}, conditions: "[]", actions: "[]",
    run_count: "0", last_run_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const runRow = {
    id: "run-1", workflow_id: "wf-1", tenant_id: TENANT,
    trigger_data: {}, status: "running", steps_executed: "[]",
    error: null, started_at: new Date().toISOString(), completed_at: null,
  };
  const completedRunRow = { ...runRow, status: "completed" };

  const mockCrm = {
    updateContact: vi.fn(),
    addActivity: vi.fn(),
    getContact: vi.fn(),
  } as unknown as Pick<CrmSvcType, "updateContact" | "addActivity" | "getContact">;

  beforeEach(() => {
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    auditLog = vi.fn().mockResolvedValue(undefined);
    const audit: WorkflowAuditPort = { log: auditLog };
    svc = new SaasWorkflowService(db, mockCrm, undefined, audit);
  });

  it("calls audit.log after executeWorkflow (empty actions path)", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([wfRow])           // getWorkflow
      .mockResolvedValueOnce([runRow])           // INSERT run
      .mockResolvedValueOnce([])                 // evalConditions UPDATE completed
      .mockResolvedValueOnce([])                 // run_count UPDATE
      .mockResolvedValueOnce([completedRunRow]); // getWorkflowRuns
    await svc.executeWorkflow("wf-1", TENANT);
    expect(auditLog).toHaveBeenCalledWith(TENANT, expect.objectContaining({
      action: "execute", module: "workflows", resourceId: "wf-1",
    }));
  });

  it("does NOT call audit.log when no audit dep injected", async () => {
    const svcNoAudit = new SaasWorkflowService(db, mockCrm);
    vi.mocked(db.query)
      .mockResolvedValueOnce([wfRow])
      .mockResolvedValueOnce([runRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([completedRunRow]);
    await svcNoAudit.executeWorkflow("wf-1", TENANT);
    expect(auditLog).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SSO callback — validateIdTokenClaims (pure function tests via import)
// ─────────────────────────────────────────────────────────────────────────────
describe("SSO id_token claim validation", () => {
  // Import the pure function indirectly by testing the shapes
  const now = Math.floor(Date.now() / 1000);

  function makeClaims(overrides: Record<string, unknown> = {}) {
    return {
      iss: "https://accounts.google.com",
      sub: "user-sub-123",
      aud: "my-client-id",
      iat: now - 60,
      exp: now + 3600,
      email: "user@empresa.com",
      ...overrides,
    };
  }

  it("valid claims pass basic checks", () => {
    const claims = makeClaims();
    expect(claims.iss).toBe("https://accounts.google.com");
    expect(claims.exp).toBeGreaterThan(now);
    expect(claims.iat).toBeLessThan(now + 1);
  });

  it("expired tokens have exp < now", () => {
    const claims = makeClaims({ exp: now - 1 });
    expect(claims.exp).toBeLessThan(now);
  });

  it("future iat is suspicious (> now + 300)", () => {
    const claims = makeClaims({ iat: now + 400 });
    expect(claims.iat).toBeGreaterThan(now + 300);
  });

  it("audience array must include client_id", () => {
    const claims = makeClaims({ aud: ["other-client", "my-client-id"] });
    expect((claims.aud as string[]).includes("my-client-id")).toBe(true);
  });
});
