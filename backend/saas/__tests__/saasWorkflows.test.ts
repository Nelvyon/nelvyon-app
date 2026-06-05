import { afterEach, describe, expect, it, vi } from "vitest";

import * as Auth from "@nelvyon/auth";
import * as Saas from "@nelvyon/saas";
import * as Onboarding from "../SaasOnboardingService";
import { OsAgentError } from "@nelvyon/os-agents";
import { GET as GET_WORKFLOWS, POST as POST_WORKFLOWS } from "../../../apps/web/src/app/api/saas/workflows/route";
import { POST as POST_EXECUTE } from "../../../apps/web/src/app/api/saas/workflows/[workflowId]/execute/route";
import { SaasCrmService } from "../SaasCrmService";
import { SaasWorkflowService } from "../SaasWorkflowService";

type WorkflowRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "archived";
  trigger_type: "contact_created" | "contact_updated" | "stage_changed" | "job_completed" | "manual" | "scheduled";
  trigger_config: Record<string, unknown>;
  conditions: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  run_count: number;
  last_run_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type RunRow = {
  id: string;
  workflow_id: string;
  tenant_id: string;
  trigger_data: Record<string, unknown>;
  status: "running" | "completed" | "failed";
  steps_executed: Array<Record<string, unknown>>;
  error: string | null;
  started_at: Date;
  completed_at: Date | null;
};

function makeDb() {
  const workflows: WorkflowRow[] = [];
  const runs: RunRow[] = [];
  const activity: Array<{ tenant_id: string; event_type: string; description: string; metadata: Record<string, unknown> }> = [];
  let tick = 0;

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    const p = params ?? [];
    if (s.startsWith("INSERT INTO saas_workflows")) {
      const status = String(p[3]);
      const trigger = String(p[4]);
      if (!["draft", "active", "paused", "archived"].includes(status) || !["contact_created", "contact_updated", "stage_changed", "deal_stage_changed", "job_completed", "manual", "scheduled"].includes(trigger)) {
        const e = new Error("check");
        (e as { code: string }).code = "23514";
        throw e;
      }
      const row: WorkflowRow = {
        id: `w-${workflows.length + 1}`,
        tenant_id: String(p[0]),
        name: String(p[1]),
        description: (p[2] as string | null) ?? null,
        status: status as WorkflowRow["status"],
        trigger_type: trigger as WorkflowRow["trigger_type"],
        trigger_config: (p[5] as Record<string, unknown>) ?? {},
        conditions: (p[6] as Array<Record<string, unknown>>) ?? [],
        actions: (p[7] as Array<Record<string, unknown>>) ?? [],
        run_count: 0,
        last_run_at: null,
        created_at: new Date(Date.now() + ++tick),
        updated_at: new Date(Date.now() + tick),
      };
      workflows.push(row);
      return [row as unknown as T];
    }
    if (s.includes("FROM saas_workflows WHERE tenant_id = $1 ORDER BY created_at DESC")) {
      return workflows.filter((w) => w.tenant_id === String(p[0])).sort((a, b) => b.created_at.getTime() - a.created_at.getTime()) as unknown as T[];
    }
    if (s.includes("FROM saas_workflows WHERE tenant_id = $1 AND id = $2 LIMIT 1")) {
      const row = workflows.find((w) => w.tenant_id === String(p[0]) && w.id === String(p[1]));
      return (row ? [row] : []) as T[];
    }
    if (s.startsWith("UPDATE saas_workflows SET name = COALESCE")) {
      const row = workflows.find((w) => w.tenant_id === String(p[0]) && w.id === String(p[1]));
      if (!row) return [] as T[];
      if (p[2] !== null) row.name = String(p[2]);
      if (p[3] !== null) row.description = String(p[3]);
      if (p[4] !== null) row.status = String(p[4]) as WorkflowRow["status"];
      if (p[5] !== null) row.trigger_type = String(p[5]) as WorkflowRow["trigger_type"];
      if (p[6] !== null) row.trigger_config = p[6] as Record<string, unknown>;
      if (p[7] !== null) row.conditions = p[7] as Array<Record<string, unknown>>;
      if (p[8] !== null) row.actions = p[8] as Array<Record<string, unknown>>;
      row.updated_at = new Date(Date.now() + ++tick);
      return [row as unknown as T];
    }
    if (s.startsWith("DELETE FROM saas_workflows")) {
      const idx = workflows.findIndex((w) => w.tenant_id === String(p[0]) && w.id === String(p[1]));
      if (idx >= 0) workflows.splice(idx, 1);
      return [] as T[];
    }
    if (s.startsWith("INSERT INTO saas_workflow_runs")) {
      const row: RunRow = {
        id: `r-${runs.length + 1}`,
        workflow_id: String(p[0]),
        tenant_id: String(p[1]),
        trigger_data: (p[2] as Record<string, unknown>) ?? {},
        status: "running",
        steps_executed: [],
        error: null,
        started_at: new Date(Date.now() + ++tick),
        completed_at: null,
      };
      runs.push(row);
      return [row as unknown as T];
    }
    if (s.startsWith("UPDATE saas_workflow_runs SET status='completed'")) {
      const row = runs.find((r) => r.id === String(p[0]));
      if (row) {
        row.status = "completed";
        row.steps_executed = (p[1] as Array<Record<string, unknown>>) ?? [];
        row.completed_at = new Date(Date.now() + ++tick);
      }
      return [] as T[];
    }
    if (s.startsWith("UPDATE saas_workflow_runs SET status='failed'")) {
      const row = runs.find((r) => r.id === String(p[0]));
      if (row) {
        row.status = "failed";
        row.steps_executed = (p[1] as Array<Record<string, unknown>>) ?? [];
        row.error = String(p[2] ?? "failed");
        row.completed_at = new Date(Date.now() + ++tick);
      }
      return [] as T[];
    }
    if (s.includes("UPDATE saas_workflows") && s.includes("run_count = run_count + 1")) {
      const row = workflows.find((w) => w.id === String(p[0]) && w.tenant_id === String(p[1]));
      if (row) {
        row.run_count += 1;
        row.last_run_at = new Date(Date.now() + ++tick);
      }
      return [] as T[];
    }
    if (s.startsWith("SELECT id, workflow_id, tenant_id, trigger_data, status, steps_executed")) {
      return runs.filter((r) => r.workflow_id === String(p[0]) && r.tenant_id === String(p[1])).sort((a, b) => b.started_at.getTime() - a.started_at.getTime()) as unknown as T[];
    }
    if (s.startsWith("INSERT INTO saas_activity_log")) {
      activity.push({
        tenant_id: String(p[0]),
        event_type: String(p[1]),
        description: String(p[2]),
        metadata: (p[3] as Record<string, unknown>) ?? {},
      });
      return [] as T[];
    }
    return [] as T[];
  }

  return { query, workflows, runs, activity };
}

describe("SaasWorkflowService", () => {
  it("createWorkflow crea con status 'draft'", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual" });
    expect(wf.status).toBe("draft");
  });

  it("createWorkflow falla con trigger_type inválido", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    await expect(svc.createWorkflow("t1", { name: "WF", triggerType: "bad" as never })).rejects.toThrow();
  });

  it("createWorkflow falla con status inválido", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    await expect(svc.createWorkflow("t1", { name: "WF", triggerType: "manual", status: "bad" as never })).rejects.toThrow();
  });

  it("getWorkflows retorna array vacío si no hay", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    await expect(svc.getWorkflows("t1")).resolves.toEqual([]);
  });

  it("getWorkflow retorna null si no existe", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    await expect(svc.getWorkflow("t1", "missing")).resolves.toBeNull();
  });

  it("getWorkflow no permite cross-tenant", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual" });
    await expect(svc.getWorkflow("t2", wf.id)).resolves.toBeNull();
  });

  it("updateWorkflow actualiza campos correctamente", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual" });
    const up = await svc.updateWorkflow("t1", wf.id, { name: "WF2", status: "active" });
    expect(up.name).toBe("WF2");
    expect(up.status).toBe("active");
  });

  it("activateWorkflow cambia status a 'active'", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual" });
    await expect(svc.activateWorkflow("t1", wf.id)).resolves.toMatchObject({ status: "active" });
  });

  it("pauseWorkflow cambia status a 'paused'", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual" });
    await expect(svc.pauseWorkflow("t1", wf.id)).resolves.toMatchObject({ status: "paused" });
  });

  it("deleteWorkflow elimina correctamente", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual" });
    await svc.deleteWorkflow("t1", wf.id);
    await expect(svc.getWorkflow("t1", wf.id)).resolves.toBeNull();
  });

  it("executeWorkflow crea WorkflowRun con status 'completed'", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual", actions: [{ type: "notify", config: { message: "ok" } }] as never[] });
    const run = await svc.executeWorkflow(wf.id, "t1", {});
    expect(run.status).toBe("completed");
  });

  it("executeWorkflow ejecuta action send_email correctamente", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", {
      name: "WF",
      triggerType: "manual",
      actions: [{ type: "send_email", config: { to: "a@b.com", subject: "Hola", body: "Body" } }] as never[],
    });
    await svc.executeWorkflow(wf.id, "t1", {});
    expect(db.activity[0]?.event_type).toBe("workflow_email");
  });

  it("executeWorkflow ejecuta action change_stage correctamente", async () => {
    const db = makeDb();
    const crm = {
      updateContact: vi.fn().mockResolvedValue({}),
      addActivity: vi.fn().mockResolvedValue({}),
      getContact: vi.fn().mockResolvedValue(null),
    };
    const svc = new SaasWorkflowService(db, crm);
    const wf = await svc.createWorkflow("t1", {
      name: "WF",
      triggerType: "manual",
      actions: [{ type: "change_stage", config: { contactId: "c-1", stage: "proposal" } }] as never[],
    });
    await svc.executeWorkflow(wf.id, "t1", {});
    expect(crm.updateContact).toHaveBeenCalledWith("t1", "c-1", { pipeline_stage: "proposal" });
  });

  it("executeWorkflow evalúa conditions y no ejecuta si no se cumplen", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", {
      name: "WF",
      triggerType: "manual",
      conditions: [{ field: "contact.status", operator: "equals", value: "client" }] as never[],
      actions: [{ type: "notify", config: { message: "x" } }] as never[],
    });
    const run = await svc.executeWorkflow(wf.id, "t1", { contact: { status: "lead" } });
    expect(run.stepsExecuted).toHaveLength(0);
  });

  it("executeWorkflow guarda error si action falla → status 'failed'", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", {
      name: "WF",
      triggerType: "manual",
      actions: [{ type: "change_stage", config: { contactId: "missing", stage: "proposal" } }] as never[],
    });
    const run = await svc.executeWorkflow(wf.id, "t1", {});
    expect(run.status).toBe("failed");
  });

  it("getWorkflowRuns retorna historial ordenado por started_at DESC", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual", actions: [{ type: "notify", config: { message: "ok" } }] as never[] });
    await svc.executeWorkflow(wf.id, "t1", {});
    await svc.executeWorkflow(wf.id, "t1", {});
    const runs = await svc.getWorkflowRuns(wf.id, "t1");
    expect(runs[0]?.startedAt >= runs[1]?.startedAt).toBe(true);
  });

  it("run_count se incrementa tras cada ejecución", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual", actions: [{ type: "notify", config: { message: "ok" } }] as never[] });
    await svc.executeWorkflow(wf.id, "t1", {});
    await svc.executeWorkflow(wf.id, "t1", {});
    const up = await svc.getWorkflow("t1", wf.id);
    expect(up?.runCount).toBe(2);
  });
});

describe("API SaaS workflows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Saas.resetSaasWorkflowServiceForTests();
  });

  it("API GET /api/saas/workflows → 401 sin auth", async () => {
    vi.spyOn(Auth, "authenticate").mockRejectedValue(new OsAgentError("Unauthorized"));
    const res = await GET_WORKFLOWS(new Request("https://app.test/api/saas/workflows"));
    expect(res.status).toBe(401);
  });

  it("API POST /api/saas/workflows → 201 con datos válidos", async () => {
    const db = makeDb();
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "auth-tenant-1", plan: "free" });
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "t1" }),
    } as unknown as ReturnType<typeof Onboarding.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasWorkflowService").mockReturnValue(new SaasWorkflowService(db, new SaasCrmService(db)));
    const req = new Request("https://app.test/api/saas/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "WF API", triggerType: "manual" }),
    });
    const res = await POST_WORKFLOWS(req);
    expect(res.status).toBe(201);
  });

  it("API POST /api/saas/workflows/[id]/execute → 200 con WorkflowRun", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db));
    const wf = await svc.createWorkflow("t1", { name: "WF", triggerType: "manual", actions: [{ type: "notify", config: { message: "ok" } }] as never[] });
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "auth-tenant-1", plan: "free" });
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "t1" }),
    } as unknown as ReturnType<typeof Onboarding.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasWorkflowService").mockReturnValue(svc);
    const req = new Request(`https://app.test/api/saas/workflows/${wf.id}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerData: {} }),
    });
    const res = await POST_EXECUTE(req, { params: Promise.resolve({ workflowId: wf.id }) });
    expect(res.status).toBe(200);
  });
});
