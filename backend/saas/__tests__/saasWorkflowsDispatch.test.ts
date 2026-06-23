/**
 * Tests for Bloque 1:
 * - dispatchContactCreated fires contact_created workflows
 * - dispatchContactStageChanged fires stage_changed workflows
 * - delay_minutes action pauses execution
 * - webhook_out action calls fetch with timeout
 * - add_tag action merges tag into contact
 * - cron route dispatches scheduled workflows
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../email/sesClient", () => ({
  getSesClient: () => ({ send: vi.fn().mockResolvedValue({}) }),
}));
vi.mock("@aws-sdk/client-ses", () => ({
  SendEmailCommand: vi.fn().mockImplementation((input: unknown) => input),
}));

import { SaasWorkflowService, getSaasWorkflowService, resetSaasWorkflowServiceForTests } from "../SaasWorkflowService";
import { SaasCrmService } from "../SaasCrmService";
import { dispatchContactCreated, dispatchContactStageChanged } from "../saasWorkflowDispatch";
import type { SaasContact } from "../SaasCrmService";

// Minimal in-memory DB for workflow tests
function makeDb() {
  const workflows: Array<Record<string, unknown>> = [];
  const runs: Array<Record<string, unknown>> = [];
  const contacts: Array<Record<string, unknown>> = [];
  const activity: Array<Record<string, unknown>> = [];
  let tick = 0;

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    const p = params ?? [];

    if (s.startsWith("SELECT 1 FROM saas_tenants")) return [{ "1": 1 } as unknown as T];
    if (s.startsWith("SELECT COUNT")) return [{ count: "0" } as unknown as T];
    if (s.startsWith("SELECT plan FROM saas_tenants")) return [{ plan: "pro" } as unknown as T];

    if (s.startsWith("INSERT INTO saas_workflows")) {
      const row = {
        id: `w-${workflows.length + 1}`,
        tenant_id: p[0], name: p[1], description: p[2] ?? null,
        status: p[3], trigger_type: p[4], trigger_config: p[5] ?? {},
        conditions: p[6] ?? [], actions: p[7] ?? [],
        run_count: 0, last_run_at: null,
        created_at: new Date(Date.now() + ++tick),
        updated_at: new Date(Date.now() + tick),
      };
      workflows.push(row);
      return [row as unknown as T];
    }
    if (s.includes("FROM saas_workflows WHERE tenant_id = $1 ORDER BY")) {
      return workflows.filter((w) => w.tenant_id === p[0]) as unknown as T[];
    }
    if (s.includes("FROM saas_workflows WHERE tenant_id = $1 AND id = $2")) {
      return workflows.filter((w) => w.tenant_id === p[0] && w.id === p[1]) as unknown as T[];
    }
    if (s.startsWith("UPDATE saas_workflows SET name = COALESCE")) {
      const row = workflows.find((w) => w.tenant_id === p[0] && w.id === p[1]);
      if (!row) return [] as T[];
      if (p[4] !== null) row.status = p[4];
      return [row as unknown as T];
    }
    if (s.startsWith("INSERT INTO saas_workflow_runs")) {
      const row = {
        id: `r-${runs.length + 1}`,
        workflow_id: p[0], tenant_id: p[1], trigger_data: p[2] ?? {},
        status: "running", steps_executed: [], error: null,
        started_at: new Date(Date.now() + ++tick), completed_at: null,
      };
      runs.push(row);
      return [row as unknown as T];
    }
    if (s.startsWith("UPDATE saas_workflow_runs SET status='completed'")) {
      const row = runs.find((r) => r.id === p[0]);
      if (row) { row.status = "completed"; row.steps_executed = p[1]; row.completed_at = new Date(); }
      return [] as T[];
    }
    if (s.startsWith("UPDATE saas_workflow_runs SET status='failed'")) {
      const row = runs.find((r) => r.id === p[0]);
      if (row) { row.status = "failed"; row.error = p[2]; row.completed_at = new Date(); }
      return [] as T[];
    }
    if (s.includes("run_count = run_count + 1")) {
      const row = workflows.find((w) => w.id === p[0] && w.tenant_id === p[1]);
      if (row) row.run_count = Number(row.run_count) + 1;
      return [] as T[];
    }
    if (s.startsWith("SELECT id, workflow_id")) {
      return runs.filter((r) => r.workflow_id === p[0] && r.tenant_id === p[1])
        .sort((a, b) => (b.started_at as Date).getTime() - (a.started_at as Date).getTime()) as unknown as T[];
    }
    if (s.startsWith("INSERT INTO saas_activity_log")) {
      activity.push({ tenant_id: p[0], event_type: p[1], description: p[2], metadata: p[3] });
      return [] as T[];
    }
    if (s.startsWith("SELECT id, email, name FROM saas_contacts")) {
      return contacts.filter((c) => c.tenant_id === p[0] && c.id === p[1]) as unknown as T[];
    }
    // add_tag
    if (s.startsWith("UPDATE saas_contacts") && s.includes("unnest(tags")) {
      const contact = contacts.find((c) => c.tenant_id === p[0] && c.id === p[1]);
      if (contact) {
        const existing = (contact.tags as string[]) ?? [];
        const newTags = p[2] as string[];
        contact.tags = [...new Set([...existing, ...newTags])];
      }
      return [] as T[];
    }
    return [] as T[];
  }

  return { query, workflows, runs, contacts, activity };
}

function makeContact(overrides: Partial<SaasContact> = {}): SaasContact {
  return {
    id: "contact-1",
    tenantId: "tenant-1",
    name: "Test User",
    email: "test@example.com",
    phone: null,
    company: null,
    position: null,
    status: "lead",
    pipelineStage: "new",
    value: 0,
    notes: null,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("dispatchContactCreated", () => {
  afterEach(() => {
    resetSaasWorkflowServiceForTests();
    vi.restoreAllMocks();
  });

  it("dispara workflow contact_created activo cuando se crea un contacto", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    // Inyectar svc como singleton para que dispatchContactCreated lo use
    vi.spyOn(svc, "dispatchActiveWorkflows");
    // Sobreescribir getSaasWorkflowService para devolver nuestro svc
    const mod = await import("../SaasWorkflowService");
    vi.spyOn(mod, "getSaasWorkflowService").mockReturnValue(svc);

    const wf = await svc.createWorkflow("tenant-1", {
      name: "Welcome",
      triggerType: "contact_created",
      status: "draft",
      actions: [{ type: "notify", config: { message: "New contact!" } }],
    });
    await svc.activateWorkflow("tenant-1", wf.id);

    await dispatchContactCreated("tenant-1", makeContact());

    const updated = db.workflows.find((w) => w.id === wf.id);
    expect(updated?.run_count).toBe(1);
    expect(db.runs[0]?.status).toBe("completed");
  });

  it("no dispara workflow si está en draft", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const mod = await import("../SaasWorkflowService");
    vi.spyOn(mod, "getSaasWorkflowService").mockReturnValue(svc);

    await svc.createWorkflow("tenant-1", {
      name: "Draft",
      triggerType: "contact_created",
      status: "draft",
      actions: [{ type: "notify", config: { message: "x" } }],
    });

    await dispatchContactCreated("tenant-1", makeContact());
    expect(db.runs).toHaveLength(0);
  });

  it("no hace throw si el workflow service falla (non-blocking)", async () => {
    const mod = await import("../SaasWorkflowService");
    vi.spyOn(mod, "getSaasWorkflowService").mockImplementation(() => {
      throw new Error("DB down");
    });
    await expect(dispatchContactCreated("tenant-1", makeContact())).resolves.toBeUndefined();
  });
});

describe("dispatchContactStageChanged", () => {
  afterEach(() => {
    resetSaasWorkflowServiceForTests();
    vi.restoreAllMocks();
  });

  it("dispara workflow stage_changed activo", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const mod = await import("../SaasWorkflowService");
    vi.spyOn(mod, "getSaasWorkflowService").mockReturnValue(svc);

    const wf = await svc.createWorkflow("tenant-1", {
      name: "Stage change",
      triggerType: "stage_changed",
      status: "draft",
      actions: [{ type: "notify", config: { message: "Stage changed!" } }],
    });
    await svc.activateWorkflow("tenant-1", wf.id);

    const contact = makeContact({ pipelineStage: "qualified" });
    await dispatchContactStageChanged("tenant-1", contact, "new");

    const updated = db.workflows.find((w) => w.id === wf.id);
    expect(updated?.run_count).toBe(1);
    expect(db.runs[0]?.status).toBe("completed");
  });

  it("no hace throw si el dispatch falla (non-blocking)", async () => {
    const mod = await import("../SaasWorkflowService");
    vi.spyOn(mod, "getSaasWorkflowService").mockImplementation(() => {
      throw new Error("timeout");
    });
    const contact = makeContact({ pipelineStage: "qualified" });
    await expect(dispatchContactStageChanged("tenant-1", contact, "new")).resolves.toBeUndefined();
  });
});

describe("WorkflowAction: delay_minutes", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ejecuta delay y continúa con siguiente acción", async () => {
    vi.useFakeTimers();
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));

    const wf = await svc.createWorkflow("tenant-1", {
      name: "Delay test",
      triggerType: "manual",
      status: "draft",
      actions: [
        { type: "delay_minutes", config: { minutes: 1 } },
        { type: "notify", config: { message: "after delay" } },
      ],
    });
    await svc.activateWorkflow("tenant-1", wf.id);

    const runPromise = svc.executeWorkflow(wf.id, "tenant-1", {});
    await vi.advanceTimersByTimeAsync(61_000);
    const run = await runPromise;

    expect(run.status).toBe("completed");
    expect(run.stepsExecuted).toHaveLength(2);
    expect(run.stepsExecuted[0]).toMatchObject({ action: "delay_minutes", ok: true });
    expect(run.stepsExecuted[1]).toMatchObject({ action: "notify", ok: true });
  });
});

describe("WorkflowAction: webhook_out", () => {
  it("llama a la URL con fetch y registra ok:true en steps", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));

    const wf = await svc.createWorkflow("tenant-1", {
      name: "Webhook test",
      triggerType: "manual",
      status: "draft",
      actions: [{ type: "webhook_out", config: { url: "https://example.com/hook", method: "POST" } }],
    });
    await svc.activateWorkflow("tenant-1", wf.id);

    const run = await svc.executeWorkflow(wf.id, "tenant-1", {});

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://example.com/hook");
    expect(run.stepsExecuted[0]).toMatchObject({ action: "webhook_out", ok: true, status: 200 });
    vi.unstubAllGlobals();
  });

  it("registra ok:false si fetch lanza (timeout/red)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));

    const wf = await svc.createWorkflow("tenant-1", {
      name: "Webhook fail",
      triggerType: "manual",
      status: "draft",
      actions: [{ type: "webhook_out", config: { url: "https://bad.example.com/hook" } }],
    });
    await svc.activateWorkflow("tenant-1", wf.id);

    const run = await svc.executeWorkflow(wf.id, "tenant-1", {});
    expect(run.status).toBe("completed"); // workflow no falla por webhook fallido
    expect(run.stepsExecuted[0]).toMatchObject({ action: "webhook_out", ok: false });
    vi.unstubAllGlobals();
  });
});

describe("WorkflowAction: add_tag", () => {
  it("añade tag a contacto del triggerData", async () => {
    const db = makeDb();
    db.contacts.push({
      id: "contact-1", tenant_id: "tenant-1", name: "Test", email: "t@t.com",
      phone: null, company: null, position: null, status: "lead",
      pipeline_stage: "new", value: 0, notes: null, tags: ["existing"],
      created_at: new Date(), updated_at: new Date(),
    });

    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("tenant-1", {
      name: "Tag test",
      triggerType: "contact_created",
      status: "draft",
      actions: [{ type: "add_tag", config: { tag: "new-tag" } }],
    });
    await svc.activateWorkflow("tenant-1", wf.id);

    const run = await svc.executeWorkflow(wf.id, "tenant-1", {
      contact: { id: "contact-1", name: "Test", email: "t@t.com" },
    });

    expect(run.status).toBe("completed");
    expect(run.stepsExecuted[0]).toMatchObject({ action: "add_tag", ok: true, tag: "new-tag" });
    const contact = db.contacts.find((c) => c.id === "contact-1");
    expect(contact?.tags).toContain("new-tag");
    expect(contact?.tags).toContain("existing"); // mantiene tag anterior
  });
});
