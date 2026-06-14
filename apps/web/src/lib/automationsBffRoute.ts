import { adsBffGet, adsBffPost } from "@/lib/adsBffRoute";

export { adsBffGet as automationsBffGet, adsBffPost as automationsBffPost };

export const EMPTY_WORKFLOWS_LIST = { items: [] as unknown[], total: 0, skip: 0, limit: 50 };

export const EMPTY_WORKFLOW = {
  id: 0,
  name: "",
  status: "draft",
  nodes: [] as unknown[],
  edges: [] as unknown[],
};

export const EMPTY_RULES_LIST = { items: [] as unknown[], total: 0, skip: 0, limit: 50 };

export const EMPTY_STATS = {
  total_jobs: 0,
  completed: 0,
  pending: 0,
  failed: 0,
  average_processing_ms: 0,
  success_rate: 0,
};

export const EMPTY_EXECUTIONS_LIST = { items: [] as unknown[], total: 0, skip: 0, limit: 50 };

export const EMPTY_UNIFIED_AUTOMATIONS = {
  workflows: EMPTY_WORKFLOWS_LIST,
  rules: EMPTY_RULES_LIST,
  stats: EMPTY_STATS,
  executions: EMPTY_EXECUTIONS_LIST,
  unified: {
    total_flows: 0,
    active_flows: 0,
    total_runs: 0,
    rule_executions: 0,
    workflow_runs: 0,
    jobs_completed: 0,
    jobs_failed: 0,
    success_rate: 0,
    events_24h: 0,
  },
};

export function mergeUnifiedAutomations(
  workflows: { items?: Array<{ is_active?: boolean; runs_count?: number }>; total?: number },
  rules: { items?: Array<{ is_active?: boolean; runs_count?: number }>; total?: number },
  stats: {
    total_jobs?: number;
    completed?: number;
    failed?: number;
    success_rate?: number;
  },
  executions: { items?: unknown[]; total?: number },
) {
  const wfItems = workflows.items ?? [];
  const ruleItems = rules.items ?? [];
  let workflowRuns = 0;
  for (const w of wfItems) {
    workflowRuns += Number(w.runs_count ?? 0);
  }
  let ruleRuns = 0;
  for (const r of ruleItems) {
    ruleRuns += Number(r.runs_count ?? 0);
  }
  const execTotal = executions.total ?? executions.items?.length ?? 0;

  return {
    workflows,
    rules,
    stats,
    executions,
    unified: {
      total_flows: (workflows.total ?? wfItems.length) + (rules.total ?? ruleItems.length),
      active_flows:
        wfItems.filter((w) => w.is_active).length + ruleItems.filter((r) => r.is_active).length,
      total_runs: workflowRuns + ruleRuns + execTotal,
      rule_executions: ruleRuns + execTotal,
      workflow_runs: workflowRuns,
      jobs_completed: Number(stats.completed ?? 0),
      jobs_failed: Number(stats.failed ?? 0),
      success_rate: Number(stats.success_rate ?? 0),
      events_24h: execTotal,
    },
  };
}
