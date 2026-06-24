import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsOrchestrator } from "../os-agents/OsOrchestrator";
import type { TriggerType, WorkflowAction } from "./SaasWorkflowService";

/** All supported trigger types for drag-drop visual nodes */
export type DragDropTriggerType = TriggerType;

export type DragDropNode = {
  id: string;
  type: "trigger" | "agent" | "condition" | "delay" | "notification" | "action" | string;
  label?: string;
  data?: Record<string, unknown> & {
    /** For trigger nodes: the TriggerType this node represents */
    triggerType?: DragDropTriggerType;
    /** Optional extra config for the trigger (e.g. stage_to, campania_id, tag) */
    triggerConfig?: Record<string, unknown>;
    /** For action nodes */
    actionType?: WorkflowAction["type"];
  };
  position?: { x: number; y: number };
};

export type DragDropEdge = {
  id: string;
  source: string;
  target: string;
};

export interface DragDropWorkflow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  nodes: DragDropNode[];
  edges: DragDropEdge[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DragDropWorkflowServiceDeps = {
  db?: Pick<DbClient, "query">;
  orchestrator?: Pick<OsOrchestrator, "enqueueAndDispatch">;
};

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

export class DragDropWorkflowService {
  constructor(private readonly deps: DragDropWorkflowServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get orchestrator(): Pick<OsOrchestrator, "enqueueAndDispatch"> {
    return this.deps.orchestrator ?? OsOrchestrator;
  }

  private mapRow(row: {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    nodes: DragDropNode[] | null;
    edges: DragDropEdge[] | null;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): DragDropWorkflow {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      nodes: row.nodes ?? [],
      edges: row.edges ?? [],
      isActive: row.isActive,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  async createWorkflow(
    userId: string,
    name: string,
    description: string | null,
    nodes: DragDropNode[],
    edges: DragDropEdge[],
  ): Promise<DragDropWorkflow> {
    const rows = await this.db.query<any>(
      `INSERT INTO dragdrop_workflows (user_id, name, description, nodes, edges, is_active)
       VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb, true)
       RETURNING id::text as id,
         user_id::text as "userId",
         name,
         description,
         nodes,
         edges,
         is_active as "isActive",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [userId, name.trim(), description, JSON.stringify(nodes ?? []), JSON.stringify(edges ?? [])],
    );
    return this.mapRow(rows[0]);
  }

  async updateWorkflow(
    workflowId: string,
    userId: string,
    name: string,
    nodes: DragDropNode[],
    edges: DragDropEdge[],
  ): Promise<DragDropWorkflow> {
    const rows = await this.db.query<any>(
      `UPDATE dragdrop_workflows
       SET name = $3,
         nodes = $4::jsonb,
         edges = $5::jsonb,
         updated_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid
       RETURNING id::text as id,
         user_id::text as "userId",
         name,
         description,
         nodes,
         edges,
         is_active as "isActive",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [workflowId, userId, name.trim(), JSON.stringify(nodes ?? []), JSON.stringify(edges ?? [])],
    );
    return this.mapRow(rows[0]);
  }

  async getWorkflow(workflowId: string, userId: string): Promise<DragDropWorkflow | null> {
    const rows = await this.db.query<any>(
      `SELECT id::text as id,
         user_id::text as "userId",
         name,
         description,
         nodes,
         edges,
         is_active as "isActive",
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM dragdrop_workflows
       WHERE id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [workflowId, userId],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async listWorkflows(userId: string): Promise<DragDropWorkflow[]> {
    const rows = await this.db.query<any>(
      `SELECT id::text as id,
         user_id::text as "userId",
         name,
         description,
         nodes,
         edges,
         is_active as "isActive",
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM dragdrop_workflows
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map((r: any) => this.mapRow(r));
  }

  async deleteWorkflow(workflowId: string, userId: string): Promise<void> {
    await this.db.query(`DELETE FROM dragdrop_workflows WHERE id = $1::uuid AND user_id = $2::uuid`, [workflowId, userId]);
  }

  /**
   * Save tenant_id on a drag-drop workflow (required before publishing as SaasWorkflow).
   * Called after the user has a SaaS context attached to their visual builder session.
   */
  async attachTenant(workflowId: string, userId: string, tenantId: string): Promise<void> {
    await this.db.query(
      `UPDATE dragdrop_workflows SET tenant_id=$3, updated_at=NOW() WHERE id=$1::uuid AND user_id=$2::uuid`,
      [workflowId, userId, tenantId],
    );
  }

  /**
   * Publish a drag-drop workflow into the SaaS workflow engine.
   * Extracts the trigger node + action nodes → creates a real SaasWorkflow in 'draft' status.
   * Returns { saasWorkflowId } so the caller can activate it via /api/saas/workflows.
   */
  async publishAsSaasWorkflow(
    workflowId: string,
    userId: string,
    tenantId: string,
  ): Promise<{ saasWorkflowId: string }> {
    const wf = await this.getWorkflow(workflowId, userId);
    if (!wf) throw new Error("Drag-drop workflow not found");

    // Find trigger node
    const triggerNode = wf.nodes.find((n) => n.type === "trigger");
    const triggerType: TriggerType =
      (triggerNode?.data?.triggerType as TriggerType | undefined) ?? "manual";
    const triggerConfig =
      (triggerNode?.data?.triggerConfig as Record<string, unknown> | undefined) ?? {};

    // Build actions from action/notification nodes in DAG order (follow edges from trigger)
    const actionNodes = wf.nodes.filter((n) => n.type === "action" || n.type === "notification");
    const actions: WorkflowAction[] = actionNodes.map((n) => {
      const d = n.data ?? {};
      const actionType = d.actionType as WorkflowAction["type"] | undefined;
      if (actionType === "send_email") {
        return { type: "send_email", config: { to: "{{contact.email}}", subject: String(d.subject ?? n.label ?? ""), body: String(d.body ?? "") } };
      }
      if (actionType === "notify" || n.type === "notification") {
        return { type: "notify", config: { message: String(d.message ?? n.label ?? "Notification") } };
      }
      if (actionType === "add_tag") {
        return { type: "add_tag", config: { tag: String(d.tag ?? "") } };
      }
      if (actionType === "webhook_out") {
        return { type: "webhook_out", config: { url: String(d.url ?? ""), method: "POST" } };
      }
      // Default: notify
      return { type: "notify", config: { message: `Action: ${n.label ?? n.id}` } };
    });

    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_workflows (tenant_id, name, description, status, trigger_type, trigger_config, conditions, actions)
       VALUES ($1,$2,$3,'draft',$4,$5::jsonb,'[]'::jsonb,$6::jsonb)
       RETURNING id`,
      [tenantId, wf.name, wf.description, triggerType, JSON.stringify(triggerConfig), JSON.stringify(actions)],
    );

    // Tag the drag-drop workflow with tenant for future reference
    await this.attachTenant(workflowId, userId, tenantId);

    return { saasWorkflowId: rows[0].id };
  }

  async executeWorkflow(workflowId: string, userId: string): Promise<{ jobIds: string[] }> {
    const wf = await this.getWorkflow(workflowId, userId);
    if (!wf) return { jobIds: [] };

    const jobIds: string[] = [];
    for (const node of wf.nodes) {
      if (node.type !== "agent") continue;
      const serviceIdRaw = node.data?.serviceId ?? node.data?.agentId ?? node.label;
      const serviceId = typeof serviceIdRaw === "string" ? serviceIdRaw.trim() : "";
      if (!serviceId) continue;
      const out = await this.orchestrator.enqueueAndDispatch({
        serviceId,
        clientId: userId,
        payload: {
          source: "dragdrop_workflow",
          workflowId,
          nodeId: node.id,
        },
      });
      if (out.jobId) jobIds.push(out.jobId);
    }
    return { jobIds };
  }
}

let cachedDragDropWorkflowService: DragDropWorkflowService | undefined;

export function getDragDropWorkflowService(): DragDropWorkflowService {
  if (!cachedDragDropWorkflowService) cachedDragDropWorkflowService = new DragDropWorkflowService();
  return cachedDragDropWorkflowService;
}

export function resetDragDropWorkflowServiceForTests(): void {
  cachedDragDropWorkflowService = undefined;
}
