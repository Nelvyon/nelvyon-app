export interface OsGlobalWorkspaceRiskItem {
  workspace_id: number;
  workspace_name: string;
  status: "ok" | "warn" | "crit";
  failed_jobs_24h: number;
  reason: string;
  updated_at: string;
  cta: string;
}

export interface OsGlobalSnapshot {
  window: "24h";
  five_xx_rate: number;
  latency_p95_ms: number;
  failed_jobs_24h: number;
  queue_backlog: number;
  status: "ok" | "warn" | "crit";
  workspaces_seen: number;
  top_risky_workspaces: OsGlobalWorkspaceRiskItem[];
}

export interface OsGlobalChangeJournalItem {
  event_type: string;
  workspace_id: number;
  workspace_name: string;
  actor_user_id: string;
  actor_email?: string | null;
  from_value: string;
  to_value: string;
  note?: string | null;
  created_at: string;
}
