/**
 * Agent Orchestrator — contracts + InMemory runtime (flag-gated).
 * See `runtime.ts` for `getAgentOrchestrator()`.
 */

export const ORCHESTRATOR_CONTRACT_VERSION = "1.0.0";

export type OrchestratorJobState =
  | "queued"
  | "scheduled"
  | "running"
  | "waiting_approval"
  | "waiting_tool"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "dead_letter";

export type OrchestratorJob = {
  jobId: string;
  tenantId: string;
  agentId: string;
  correlationId: string;
  traceId: string;
  state: OrchestratorJobState;
  priority: number;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
  parentJobId: string | null;
};

export type OrchestratorEvent =
  | { type: "job.enqueued"; jobId: string; tenantId: string }
  | { type: "job.started"; jobId: string }
  | { type: "job.waiting_approval"; jobId: string; approvalId: string }
  | { type: "job.succeeded"; jobId: string }
  | { type: "job.failed"; jobId: string; error: string }
  | { type: "job.cancelled"; jobId: string }
  | { type: "job.dead_letter"; jobId: string };

export type OrchestratorCoordinationPlan = {
  /** Fan-out to specialist agents then reduce via CEO supervisor. */
  pattern: "sequential" | "parallel_fanout" | "pipeline" | "supervisor_worker";
  agents: string[];
  timeoutMs: number;
  requireAllSuccess: boolean;
};

export interface IAgentOrchestrator {
  readonly contractVersion: string;
  enqueue(job: Omit<OrchestratorJob, "jobId" | "state" | "attempts" | "startedAt" | "finishedAt" | "lastError">): Promise<string>;
  getJob(tenantId: string, jobId: string): Promise<OrchestratorJob | null>;
  cancel(tenantId: string, jobId: string, actorId: string): Promise<boolean>;
  coordinate(tenantId: string, plan: OrchestratorCoordinationPlan, input: string): Promise<string>;
}

export type OrchestratorResilienceSpec = {
  maxConcurrentPerTenant: number;
  maxQueueDepth: number;
  retryBackoffMs: number[];
  circuitBreakerFailures: number;
  deadLetterAfterAttempts: number;
  checkpointIntervalMs: number;
  recoverOnRestart: true;
};

export const ORCHESTRATOR_RESILIENCE: OrchestratorResilienceSpec = {
  maxConcurrentPerTenant: 4,
  maxQueueDepth: 200,
  retryBackoffMs: [500, 2000, 8000],
  circuitBreakerFailures: 5,
  deadLetterAfterAttempts: 5,
  checkpointIntervalMs: 30_000,
  recoverOnRestart: true,
};

export type OrchestratorObservabilitySpec = {
  metrics: string[];
  traces: string[];
  noSecretsInLogs: true;
};

export const ORCHESTRATOR_OBSERVABILITY: OrchestratorObservabilitySpec = {
  metrics: [
    "orch.jobs.queued",
    "orch.jobs.running",
    "orch.jobs.succeeded",
    "orch.jobs.failed",
    "orch.jobs.dead_letter",
    "orch.latency.p95_ms",
  ],
  traces: ["jobId", "tenantId", "agentId", "correlationId", "traceId", "state"],
  noSecretsInLogs: true,
};

export class OrchestratorNotEnabledError extends Error {
  constructor() {
    super("Agent Orchestrator runtime not enabled until MCP certified + Shared Memory block.");
    this.name = "OrchestratorNotEnabledError";
  }
}

export class UnimplementedOrchestrator implements IAgentOrchestrator {
  readonly contractVersion = ORCHESTRATOR_CONTRACT_VERSION;
  async enqueue(): Promise<string> {
    throw new OrchestratorNotEnabledError();
  }
  async getJob(): Promise<OrchestratorJob | null> {
    throw new OrchestratorNotEnabledError();
  }
  async cancel(): Promise<boolean> {
    throw new OrchestratorNotEnabledError();
  }
  async coordinate(): Promise<string> {
    throw new OrchestratorNotEnabledError();
  }
}

export function isOrchestratorEnabled(): boolean {
  return (process.env.NELVYON_ORCHESTRATOR_ENABLED ?? "0") === "1";
}
