export interface ObservabilityHealth {
  window: "24h";
  five_xx_rate: number;
  latency_p95_ms: number;
  failed_jobs: number;
  queue_backlog: number;
  status: "ok" | "warn" | "crit";
}

export interface ObservabilityIncident {
  kind: "endpoint" | "job_type";
  key: string;
  failures: number;
  last_error: string;
  correlation_id: string | null;
  cta_runbook: string;
}

export interface ObservabilityAlertRule {
  key: string;
  label: string;
  current: number;
  threshold_warn: number;
  threshold_crit: number;
  unit: string;
  status: "ok" | "warn" | "crit";
  would_fire: boolean;
}

export interface ObservabilityAlertsSimulation {
  window: "24h";
  note: string;
  rules: ObservabilityAlertRule[];
}
