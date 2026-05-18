import { apiClient } from "@/core/api";
import { AgentRun, AgentRunListResponse, CreateAgentRunInput } from "@/features/agents/types";

const AGENT_RUNS_BASE = "/api/v1/entities/automation_jobs";

export const agentsApi = {
  listRuns: () => apiClient.get<AgentRunListResponse>(`${AGENT_RUNS_BASE}?limit=50&sort=-created_at`, { tenantScoped: true }),
  getRunById: (id: number) => apiClient.get<AgentRun>(`${AGENT_RUNS_BASE}/${id}`, { tenantScoped: true }),
  createRun: (input: CreateAgentRunInput) =>
    apiClient.post<AgentRun, CreateAgentRunInput>(AGENT_RUNS_BASE, {
      tenantScoped: true,
      body: input,
    }),
};
