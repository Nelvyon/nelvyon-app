import { apiClient } from "@/core/api";

export type WorkflowNode = {
  id: string;
  nodeType: string;
  category: "trigger" | "action" | "logic" | "end";
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type Workflow = {
  id: number;
  name: string;
  description?: string;
  trigger_type?: string;
  status?: string;
  is_active?: boolean;
  runs_count?: number;
  last_run_at?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type WorkflowListResponse = {
  items: Workflow[];
  total: number;
  skip: number;
  limit: number;
};

export type WorkflowExecution = {
  id: number;
  workflow_id: number;
  status: string;
  trigger_type?: string;
  trigger_data?: Record<string, unknown>;
  steps_log?: unknown[];
  error_message?: string;
  started_at?: string;
  completed_at?: string;
};

const BASE = "/api/platform/automations/workflows";

export const workflowsApi = {
  list: (skip = 0, limit = 50) =>
    apiClient.get<WorkflowListResponse>(`${BASE}?skip=${skip}&limit=${limit}`, { tenantScoped: true }),

  getById: (id: number) => apiClient.get<Workflow>(`${BASE}/${id}`, { tenantScoped: true }),

  create: (body: { name: string; description?: string; nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }) =>
    apiClient.post<Workflow, typeof body>(BASE, { tenantScoped: true, body }),

  update: (id: number, body: Partial<{ name: string; description: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }>) =>
    apiClient.put<Workflow, typeof body>(`${BASE}/${id}`, { tenantScoped: true, body }),

  activate: (id: number) => apiClient.post<Workflow>(`${BASE}/${id}/activate`, { tenantScoped: true }),

  trigger: (id: number, trigger_data: Record<string, unknown> = {}) =>
    apiClient.post<{ execution_id: number; status: string; steps: unknown[] }>(`${BASE}/${id}/trigger`, {
      tenantScoped: true,
      body: { trigger_data },
    }),

  executions: (id: number, skip = 0, limit = 50) =>
    apiClient.get<{ items: WorkflowExecution[]; total: number }>(
      `${BASE}/${id}/executions?skip=${skip}&limit=${limit}`,
      { tenantScoped: true },
    ),
};
