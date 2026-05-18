export type AgentRunStatus = "queued" | "running" | "success" | "error";

export interface AgentRun {
  id: number;
  workspace_id?: number | null;
  job_type: string;
  status: string;
  source?: string | null;
  priority?: string | null;
  input_data?: string | null;
  output_data?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  delivered_at?: string | null;
  processing_time_ms?: number | null;
}

export interface AgentRunListResponse {
  items: AgentRun[];
  total: number;
  skip: number;
  limit: number;
}

export interface CreateAgentRunInput {
  job_type: string;
  status: "queued";
  source: "agent_launcher_v1";
  priority: "normal";
  input_data: string;
}

export interface AgentTaskPreset {
  key: string;
  label: string;
  description: string;
  job_type: string;
  input: Record<string, string | number | boolean>;
}

export const AGENT_TASK_PRESETS: readonly AgentTaskPreset[] = [
  {
    key: "daily_ops_snapshot",
    label: "Daily ops snapshot",
    description: "Generate a workspace operational snapshot from existing CRM + inbox signals.",
    job_type: "agent_daily_ops_snapshot",
    input: { report_scope: "workspace", include_risk: true },
  },
  {
    key: "ticket_triage_digest",
    label: "Ticket triage digest",
    description: "Build a concise digest of open and pending tickets for operator handoff.",
    job_type: "agent_ticket_triage_digest",
    input: { statuses: "open,pending", audience: "operators" },
  },
  {
    key: "campaign_health_check",
    label: "Campaign health check",
    description: "Summarize campaign status and at-risk rows using current workspace data.",
    job_type: "agent_campaign_health_check",
    input: { include_at_risk_only: false, include_owner_rollup: true },
  },
];
