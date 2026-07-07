import { describe, expect, it, vi } from "vitest";

import { SaasWorkflowService } from "../SaasWorkflowService";

type RunRow = {
  id: string;
  workflow_id: string;
  tenant_id: string;
  trigger_data: Record<string, unknown>;
  status: string;
  steps_executed: unknown[];
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

describe("SaasWorkflowService.executeWorkflow idempotency", () => {
  it("returns existing run when idempotency key matches", async () => {
    const existing: RunRow = {
      id: "run-1",
      workflow_id: "wf-1",
      tenant_id: "t1",
      trigger_data: {},
      status: "completed",
      steps_executed: [],
      error: null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM saas_workflow_runs") && sql.includes("idempotency_key")) {
        return [existing];
      }
      return [];
    });
    const svc = new SaasWorkflowService(
      { query } as never,
      { updateContact: vi.fn(), addActivity: vi.fn(), getContact: vi.fn() } as never,
    );
    const out = await svc.executeWorkflow("wf-1", "t1", {}, { idempotencyKey: "dup-key" });
    expect(out.id).toBe("run-1");
    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO saas_workflow_runs"))).toBe(false);
  });
});
