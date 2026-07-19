/**
 * Ephemeral workers — ADR-027.
 * Short-lived task units created by the orchestrator; no permanent memory by default.
 */

import { randomUUID } from "node:crypto";

export type EphemeralWorkerGoal =
  | "investigate"
  | "compare"
  | "validate"
  | "summarize"
  | "transform"
  | "review"
  | "run_test"
  | "analyze_metric"
  | "check_hypothesis"
  | "prepare_draft";

export type EphemeralWorkerSpec = {
  workerId: string;
  goal: EphemeralWorkerGoal;
  objective: string;
  parentAgentId: string | null;
  tenantId: string;
  correlationId: string;
  allowedTools: string[];
  maxSteps: number;
  timeoutMs: number;
  maxTokens: number;
  persistMemory: false;
  createdAt: string;
  expiresAt: string;
};

export type EphemeralWorkerResult = {
  workerId: string;
  ok: boolean;
  output: string;
  stepsUsed: number;
  evidence: Record<string, unknown>;
  error?: string;
};

const active = new Map<string, EphemeralWorkerSpec>();

export function createEphemeralWorker(input: {
  goal: EphemeralWorkerGoal;
  objective: string;
  tenantId: string;
  correlationId: string;
  parentAgentId?: string | null;
  allowedTools?: string[];
  maxSteps?: number;
  timeoutMs?: number;
  maxTokens?: number;
}): EphemeralWorkerSpec {
  const workerId = `ew_${randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  const timeoutMs = input.timeoutMs ?? 60_000;
  const spec: EphemeralWorkerSpec = {
    workerId,
    goal: input.goal,
    objective: input.objective.slice(0, 4000),
    parentAgentId: input.parentAgentId ?? null,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    allowedTools: input.allowedTools ?? ["rag.search", "memory.read"],
    maxSteps: input.maxSteps ?? 3,
    timeoutMs,
    maxTokens: input.maxTokens ?? 1024,
    persistMemory: false,
    createdAt,
    expiresAt: new Date(Date.now() + timeoutMs).toISOString(),
  };
  active.set(workerId, spec);
  return spec;
}

export function getEphemeralWorker(workerId: string): EphemeralWorkerSpec | null {
  return active.get(workerId) ?? null;
}

/** Deterministic sandbox execute — no LLM; structured stub for CI. */
export async function runEphemeralWorkerSandbox(
  workerId: string,
): Promise<EphemeralWorkerResult> {
  const spec = active.get(workerId);
  if (!spec) {
    return { workerId, ok: false, output: "", stepsUsed: 0, evidence: {}, error: "worker_not_found" };
  }
  if (Date.now() > Date.parse(spec.expiresAt)) {
    destroyEphemeralWorker(workerId);
    return { workerId, ok: false, output: "", stepsUsed: 0, evidence: {}, error: "worker_expired" };
  }

  const output = [
    `## Worker: ${spec.workerId}`,
    `## Goal: ${spec.goal}`,
    `## Objective`,
    spec.objective.slice(0, 500),
    `## Result`,
    `Sandbox ephemeral worker completed for ${spec.goal}. No permanent memory written.`,
    `## Evidence`,
    `persistMemory=false parent=${spec.parentAgentId ?? "none"}`,
  ].join("\n");

  const result: EphemeralWorkerResult = {
    workerId,
    ok: true,
    output,
    stepsUsed: 1,
    evidence: {
      goal: spec.goal,
      tenantId: spec.tenantId,
      persistMemory: false,
      toolsAllowed: spec.allowedTools,
      llmInvoked: false,
    },
  };
  destroyEphemeralWorker(workerId);
  return result;
}

export function destroyEphemeralWorker(workerId: string): boolean {
  return active.delete(workerId);
}

export function listActiveEphemeralWorkers(tenantId?: string): EphemeralWorkerSpec[] {
  const all = [...active.values()];
  return tenantId ? all.filter((w) => w.tenantId === tenantId) : all;
}

export function resetEphemeralWorkersForTests(): void {
  active.clear();
}
