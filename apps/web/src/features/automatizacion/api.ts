import { apiClient } from "@/core/api";

import type { UnifiedAutomationsReporting, WorkflowRule, WorkflowSummary } from "@/features/automatizacion/types";
import type { WorkflowEdge, WorkflowNode } from "@/features/workflows/api";

const BFF = "/api/platform/automations";

export const automatizacionApi = {
  listWorkflows: () =>
    apiClient.get<{ items: WorkflowSummary[]; total: number }>(`${BFF}/workflows`, { tenantScoped: true }),
  createWorkflow: (body: {
    name: string;
    description?: string;
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
  }) => apiClient.post<WorkflowSummary>(`${BFF}/workflows`, { tenantScoped: true, body }),
  getWorkflow: (id: number) =>
    apiClient.get<WorkflowSummary & { nodes: WorkflowNode[]; edges: WorkflowEdge[] }>(
      `${BFF}/workflows/${id}`,
      { tenantScoped: true },
    ),
  updateWorkflow: (
    id: number,
    body: Partial<{ name: string; description: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }>,
  ) => apiClient.put(`${BFF}/workflows/${id}`, { tenantScoped: true, body }),
  activateWorkflow: (id: number) =>
    apiClient.post(`${BFF}/workflows/${id}/activate`, { tenantScoped: true }),
  workflowExecutions: (id: number) =>
    apiClient.get<{ items: unknown[]; total: number }>(`${BFF}/workflows/${id}/executions`, {
      tenantScoped: true,
    }),
  listRules: () =>
    apiClient.get<{ items: WorkflowRule[]; total: number }>(`${BFF}/rules`, { tenantScoped: true }),
  createRule: (body: {
    name: string;
    description?: string;
    trigger_type: string;
    action_type: string;
    trigger_config?: string;
    action_config?: string;
    is_active?: boolean;
  }) => apiClient.post<WorkflowRule>(`${BFF}/rules`, { tenantScoped: true, body }),
  executeRule: (id: number, trigger_data?: Record<string, unknown>) =>
    apiClient.post(`${BFF}/rules/${id}/execute`, { tenantScoped: true, body: trigger_data ?? {} }),
  stats: () => apiClient.get(`${BFF}/stats`, { tenantScoped: true }),
  executions: () => apiClient.get(`${BFF}/executions`, { tenantScoped: true }),
  unifiedReporting: () =>
    apiClient.get<UnifiedAutomationsReporting>(`${BFF}/reporting/unified`, { tenantScoped: true }),
};
