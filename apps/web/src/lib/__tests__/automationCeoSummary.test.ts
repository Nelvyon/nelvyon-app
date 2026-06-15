import { describe, expect, it } from "vitest";

import { buildAutomationCeoSummary } from "@/lib/automationCeoSummary";
import type { UnifiedAutomationsReporting } from "@/features/automatizacion/types";

const emptyReporting = (): UnifiedAutomationsReporting => ({
  workflows: { items: [], total: 0 },
  rules: { items: [], total: 0 },
  stats: {
    total_jobs: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    average_processing_ms: 0,
    success_rate: 0,
  },
  executions: { items: [], total: 0 },
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
});

describe("buildAutomationCeoSummary", () => {
  it("recommends activating first flow when none active", () => {
    const summary = buildAutomationCeoSummary(emptyReporting());
    expect(summary.enrollments.total).toBe(0);
    expect(summary.recommendations.some((r) => r.id === "activate-first-flow")).toBe(true);
  });

  it("counts failed enrollments from executions and jobs", () => {
    const data = emptyReporting();
    data.stats.failed = 2;
    data.stats.pending = 1;
    data.unified.total_runs = 10;
    data.unified.jobs_failed = 2;
    data.executions.items = [
      {
        id: 1,
        rule_id: 5,
        rule_name: "Nurture lead",
        trigger_type: "form_submit",
        action_type: "send_email",
        status: "failed",
        error_message: "SMTP timeout",
      },
    ];
    const summary = buildAutomationCeoSummary(data);
    expect(summary.enrollments.failed).toBeGreaterThanOrEqual(3);
    expect(summary.workflow_errors.some((w) => w.failed_count === 1)).toBe(true);
    expect(summary.recommendations.some((r) => r.id === "fix-failures")).toBe(true);
  });

  it("suggests scaling when healthy", () => {
    const data = emptyReporting();
    data.unified.active_flows = 2;
    data.unified.total_flows = 3;
    data.unified.success_rate = 92;
    data.unified.total_runs = 40;
    const summary = buildAutomationCeoSummary(data);
    expect(summary.recommendations.some((r) => r.id === "scale-automation")).toBe(true);
  });
});
