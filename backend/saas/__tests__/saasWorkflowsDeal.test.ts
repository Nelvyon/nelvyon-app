import { afterEach, describe, expect, it, vi } from "vitest";

import { SaasCrmService } from "../SaasCrmService";
import { SaasDealsService } from "../SaasDealsService";
import { SaasWorkflowService } from "../SaasWorkflowService";

type WorkflowRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "archived";
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  run_count: number;
  last_run_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function makeWorkflowDb() {
  const workflows: WorkflowRow[] = [];
  const runs: Array<{ id: string; workflow_id: string; tenant_id: string; trigger_data: Record<string, unknown>; status: string; steps_executed: unknown[]; error: string | null; started_at: Date; completed_at: Date | null }> = [];
  const activity: unknown[] = [];
  let tick = 0;

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    const p = params ?? [];
    if (s.startsWith("INSERT INTO saas_workflows")) {
      const row: WorkflowRow = {
        id: `w-${workflows.length + 1}`,
        tenant_id: String(p[0]),
        name: String(p[1]),
        description: (p[2] as string | null) ?? null,
        status: String(p[3]) as WorkflowRow["status"],
        trigger_type: String(p[4]),
        trigger_config: (p[5] as Record<string, unknown>) ?? {},
        conditions: (p[6] as Array<Record<string, unknown>>) ?? [],
        actions: (p[7] as Array<Record<string, unknown>>) ?? [],
        run_count: 0,
        last_run_at: null,
        created_at: new Date(++tick),
        updated_at: new Date(tick),
      };
      workflows.push(row);
      return [row as unknown as T];
    }
    if (s.includes("FROM saas_workflows WHERE tenant_id = $1 ORDER BY")) {
      return workflows.filter((w) => w.tenant_id === String(p[0])) as unknown as T[];
    }
    if (s.includes("FROM saas_workflows WHERE tenant_id = $1 AND id = $2")) {
      const row = workflows.find((w) => w.tenant_id === String(p[0]) && w.id === String(p[1]));
      return (row ? [row] : []) as T[];
    }
    if (s.startsWith("UPDATE saas_workflows SET name = COALESCE")) {
      const row = workflows.find((w) => w.tenant_id === String(p[0]) && w.id === String(p[1]));
      if (!row) return [] as T[];
      if (p[4] !== null) row.status = String(p[4]) as WorkflowRow["status"];
      return [row as unknown as T];
    }
    if (s.startsWith("INSERT INTO saas_workflow_runs")) {
      const row = {
        id: `r-${runs.length + 1}`,
        workflow_id: String(p[0]),
        tenant_id: String(p[1]),
        trigger_data: (p[2] as Record<string, unknown>) ?? {},
        status: "running",
        steps_executed: [],
        error: null,
        started_at: new Date(++tick),
        completed_at: null,
      };
      runs.push(row);
      return [row as unknown as T];
    }
    if (s.startsWith("UPDATE saas_workflow_runs SET status='completed'")) {
      const row = runs.find((r) => r.id === String(p[0]));
      if (row) {
        row.status = "completed";
        row.steps_executed = (p[1] as unknown[]) ?? [];
        row.completed_at = new Date(++tick);
      }
      return [] as T[];
    }
    if (s.startsWith("UPDATE saas_workflows SET run_count")) return [] as T[];
    if (s.startsWith("INSERT INTO saas_activity_log")) {
      activity.push(p);
      return [] as T[];
    }
    if (s.includes("FROM saas_workflow_runs")) {
      return runs.filter((r) => r.workflow_id === String(p[0]) && r.tenant_id === String(p[1])) as unknown as T[];
    }
    if (s.includes("SELECT plan FROM saas_tenants")) return [{ plan: "enterprise" }] as T[];
    if (s.includes("COUNT(*)") && s.includes("FROM saas_workflows")) return [{ n: 0 }] as T[];
    return [] as T[];
  }

  return { query, workflows, runs, activity };
}

describe("SaasWorkflowService deal_stage_changed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatchActiveWorkflows ejecuta workflow activo con trigger deal_stage_changed", async () => {
    const db = makeWorkflowDb();
    const crm = {
      updateContact: vi.fn(),
      addActivity: vi.fn().mockResolvedValue({}),
      getContact: vi.fn(),
    };
    const deals = {
      changeStage: vi.fn(),
      updateDeal: vi.fn(),
      getDeal: vi.fn(),
    };
    const svc = new SaasWorkflowService(db, crm, deals);
    const wf = await svc.createWorkflow("t1", {
      name: "On proposal",
      triggerType: "deal_stage_changed",
      triggerConfig: { stage_to: "proposal" },
      actions: [{ type: "notify", config: { message: "Deal en proposal" } }],
    });
    await svc.updateWorkflow("t1", wf.id, { status: "active" });

    await svc.dispatchActiveWorkflows("t1", "deal_stage_changed", {
      deal: { id: "d1", stage: "proposal", previousStage: "qualified", contactId: "c1", value: 500, probability: 40 },
      contact: { id: "c1" },
    });

    expect(db.runs.length).toBe(1);
    expect(db.runs[0]?.status).toBe("completed");
  });

  it("no dispara si trigger_config.stage_to no coincide", async () => {
    const db = makeWorkflowDb();
    const svc = new SaasWorkflowService(db, new SaasCrmService(db), undefined);
    const wf = await svc.createWorkflow("t1", {
      name: "Won only",
      triggerType: "deal_stage_changed",
      triggerConfig: { stage_to: "won" },
      actions: [{ type: "notify", config: { message: "x" } }],
    });
    await svc.updateWorkflow("t1", wf.id, { status: "active" });
    await svc.dispatchActiveWorkflows("t1", "deal_stage_changed", {
      deal: { id: "d1", stage: "proposal", previousStage: "qualified" },
    });
    expect(db.runs.length).toBe(0);
  });

  it("evalúa condiciones deal.stage y ejecuta change_deal_stage", async () => {
    const db = makeWorkflowDb();
    const crm = {
      updateContact: vi.fn(),
      addActivity: vi.fn(),
      getContact: vi.fn(),
    };
    const deals = {
      changeStage: vi.fn(),
      updateDeal: vi.fn().mockResolvedValue({ id: "d1", stage: "won" }),
      getDeal: vi.fn(),
    };
    const svc = new SaasWorkflowService(db, crm, deals);
    const wf = await svc.createWorkflow("t1", {
      name: "Auto win",
      triggerType: "manual",
      conditions: [{ field: "deal.stage", operator: "equals", value: "proposal" }],
      actions: [{ type: "change_deal_stage", config: { stage: "won" } }],
    });
    await svc.executeWorkflow(wf.id, "t1", {
      deal: { id: "d1", stage: "proposal", value: 1000, probability: 80, contactId: "c1" },
    });
    expect(deals.updateDeal).toHaveBeenCalledWith("t1", "d1", { stage: "won" });
  });

  it("create_deal_activity añade nota en contacto del deal", async () => {
    const db = makeWorkflowDb();
    const crm = {
      updateContact: vi.fn(),
      addActivity: vi.fn().mockResolvedValue({}),
      getContact: vi.fn(),
    };
    const svc = new SaasWorkflowService(db, crm, undefined);
    const wf = await svc.createWorkflow("t1", {
      name: "Log",
      triggerType: "manual",
      actions: [{ type: "create_deal_activity", config: { type: "note", description: "Seguimiento" } }],
    });
    await svc.executeWorkflow(wf.id, "t1", {
      deal: { id: "d9", contactId: "c2" },
    });
    expect(crm.addActivity).toHaveBeenCalledWith("c2", "t1", {
      activityType: "note",
      description: "[Deal d9] Seguimiento",
    });
  });
});

describe("SaasDealsService dispatches deal_stage_changed", () => {
  it("changeStage dispara workflows cuando cambia etapa", async () => {
    const deals: Array<Record<string, unknown>> = [
      {
        id: "d1",
        tenant_id: "t1",
        contact_id: "c1",
        title: "Opp",
        value: 100,
        currency: "EUR",
        stage: "new",
        probability: 10,
        expected_close_date: null,
        source: null,
        owner_user_id: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const s = sql.replace(/\s+/g, " ").trim();
      const p = params ?? [];
      if (s.includes("FROM saas_deals WHERE tenant_id = $1 AND id = $2")) {
        const row = deals.find((d) => d.tenant_id === String(p[0]) && d.id === String(p[1]));
        return (row ? [row] : []) as T[];
      }
      if (s.startsWith("UPDATE saas_deals SET")) {
        const row = deals.find((d) => d.tenant_id === String(p[0]) && d.id === String(p[1]));
        if (row && p[6] !== null) row.stage = String(p[6]);
        return (row ? [row] : []) as T[];
      }
      if (s.includes("SELECT plan FROM saas_tenants")) return [{ plan: "enterprise" }] as T[];
      if (s.includes("COUNT(*)") && s.includes("FROM saas_deals")) return [{ n: deals.length }] as T[];
      if (s.includes("FROM saas_deals WHERE tenant_id")) return deals as T[];
      if (s.includes("FROM saas_contacts")) return [{ id: "c1", pipeline_stage: "new" }] as T[];
      return [] as T[];
    }

    const db = { query };
    const dispatchSpy = vi.spyOn(await import("../saasWorkflowDispatch"), "dispatchDealStageChanged").mockResolvedValue();

    const svc = new SaasDealsService(db as never);
    await svc.changeStage("t1", "d1", "proposal");

    expect(dispatchSpy).toHaveBeenCalled();
    dispatchSpy.mockRestore();
  });
});
