import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsOrchestrator } from "../os-agents/OsOrchestrator";

export type DragDropNode = {
  id: string;
  type: "trigger" | "agent" | "condition" | "delay" | "notification" | string;
  label?: string;
  data?: Record<string, unknown>;
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
