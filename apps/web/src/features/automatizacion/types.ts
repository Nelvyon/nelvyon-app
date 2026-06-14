export type WorkflowSummary = {
  id: number;
  name: string;
  description?: string;
  status?: string;
  is_active?: boolean;
  runs_count?: number;
  last_run_at?: string;
};

export type WorkflowRule = {
  id: number;
  name: string;
  description?: string;
  trigger_type: string;
  action_type: string;
  is_active: boolean;
  runs_count: number;
  last_run_at?: string;
};

export type AutomationStats = {
  total_jobs: number;
  completed: number;
  pending: number;
  failed: number;
  average_processing_ms: number;
  success_rate: number;
};

export type AutomationExecution = {
  id: number;
  rule_id: number;
  rule_name?: string;
  trigger_type: string;
  action_type: string;
  status: string;
  executed_at?: string;
};

export type UnifiedAutomationsReporting = {
  workflows: { items: WorkflowSummary[]; total: number };
  rules: { items: WorkflowRule[]; total: number };
  stats: AutomationStats;
  executions: { items: AutomationExecution[]; total: number };
  unified: {
    total_flows: number;
    active_flows: number;
    total_runs: number;
    rule_executions: number;
    workflow_runs: number;
    jobs_completed: number;
    jobs_failed: number;
    success_rate: number;
    events_24h: number;
  };
};

export type AutomationRecipe = {
  id: string;
  title: string;
  description: string;
  connector: "crm" | "helpdesk" | "publicidad" | "email" | "ecommerce";
  trigger: string;
  action: string;
};
