/**
 * In-process Agent Orchestrator — Phase 2 runtime (flag-gated).
 * Executes jobs via sandbox (default) or optional live Private AI.
 */

import { randomUUID } from "node:crypto";
import type {
  IAgentOrchestrator,
  OrchestratorCoordinationPlan,
  OrchestratorJob,
  OrchestratorJobState,
} from "./contracts";
import {
  ORCHESTRATOR_CONTRACT_VERSION,
  ORCHESTRATOR_RESILIENCE,
  OrchestratorNotEnabledError,
  UnimplementedOrchestrator,
  isOrchestratorEnabled,
} from "./contracts";
import {
  sandboxJobExecutor,
  type OrchestratorJobExecutor,
} from "./jobExecutor";
import {
  checkpointJobs,
  getOrchestratorPersistDir,
  loadPersistedJobs,
  recoverJobsAfterRestart,
} from "./persistentStore";
import { getGlobalOperationMode, isEmergencyStopped } from "../agents/workforce/operationModes";

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemoryAgentOrchestrator implements IAgentOrchestrator {
  readonly contractVersion = ORCHESTRATOR_CONTRACT_VERSION;
  private readonly jobs = new Map<string, OrchestratorJob>();
  private readonly tenantQueues = new Map<string, string[]>();
  private readonly circuitFailures = new Map<string, number>();
  private readonly dedupeKeys = new Map<string, string>();
  private executor: OrchestratorJobExecutor;
  private readonly persistDir: string | null;
  private recoveredCount = 0;

  constructor(
    executor: OrchestratorJobExecutor = sandboxJobExecutor,
    opts?: { persistDir?: string | null },
  ) {
    this.executor = executor;
    this.persistDir = opts?.persistDir !== undefined ? opts.persistDir : getOrchestratorPersistDir();
    if (this.persistDir) {
      const loaded = loadPersistedJobs(this.persistDir);
      for (const [id, j] of loaded) this.jobs.set(id, j);
      this.recoveredCount = recoverJobsAfterRestart(this.jobs);
      this.persist();
    }
  }

  setExecutor(executor: OrchestratorJobExecutor): void {
    this.executor = executor;
  }

  getRecoveryStats(): { recovered: number; persistEnabled: boolean } {
    return { recovered: this.recoveredCount, persistEnabled: Boolean(this.persistDir) };
  }

  private persist(): void {
    if (!this.persistDir) return;
    checkpointJobs(this.persistDir, this.jobs.values());
  }

  private dedupeKey(tenantId: string, agentId: string, input: string): string {
    return `${tenantId}|${agentId}|${input.slice(0, 200)}`;
  }

  async enqueue(
    job: Omit<OrchestratorJob, "jobId" | "state" | "attempts" | "startedAt" | "finishedAt" | "lastError">,
  ): Promise<string> {
    const queue = this.tenantQueues.get(job.tenantId) ?? [];
    if (queue.length >= ORCHESTRATOR_RESILIENCE.maxQueueDepth) {
      throw new Error("orchestrator_queue_full");
    }
    const running = [...this.jobs.values()].filter(
      (j) => j.tenantId === job.tenantId && j.state === "running",
    ).length;
    const jobId = randomUUID();
    const defer =
      (process.env.NELVYON_ORCHESTRATOR_DAEMON ?? "0") === "1" ||
      (process.env.NELVYON_ORCH_DEFER ?? "0") === "1";
    const state: OrchestratorJobState = defer
      ? "queued"
      : running >= ORCHESTRATOR_RESILIENCE.maxConcurrentPerTenant
        ? "queued"
        : "running";
    const full: OrchestratorJob = {
      ...job,
      jobId,
      state,
      attempts: 0,
      startedAt: state === "running" ? nowIso() : null,
      finishedAt: null,
      lastError: null,
    };
    this.jobs.set(jobId, full);
    queue.push(jobId);
    this.tenantQueues.set(job.tenantId, queue);
    this.persist();
    return jobId;
  }

  async getJob(tenantId: string, jobId: string): Promise<OrchestratorJob | null> {
    const j = this.jobs.get(jobId);
    if (!j || j.tenantId !== tenantId) return null;
    return j;
  }

  async cancel(tenantId: string, jobId: string, _actorId: string): Promise<boolean> {
    const j = this.jobs.get(jobId);
    if (!j || j.tenantId !== tenantId) return false;
    if (j.state === "succeeded" || j.state === "cancelled" || j.state === "dead_letter") return false;
    j.state = "cancelled";
    j.finishedAt = nowIso();
    this.jobs.set(jobId, j);
    this.persist();
    return true;
  }

  /**
   * Coordinate multi-agent plan: enqueue + execute each agent via job executor.
   * Records validation evidence; fails jobs that do not meet acceptance.
   */
  async coordinate(tenantId: string, plan: OrchestratorCoordinationPlan, input: string): Promise<string> {
    if (isEmergencyStopped() || getGlobalOperationMode() === "emergency_stop") {
      throw new Error("orchestrator_emergency_stop");
    }

    const failures = this.circuitFailures.get(tenantId) ?? 0;
    if (failures >= ORCHESTRATOR_RESILIENCE.circuitBreakerFailures) {
      throw new Error("orchestrator_circuit_open");
    }

    const correlationId = randomUUID();
    const traceId = randomUUID();
    const agents = plan.agents;

    const runOne = async (agentId: string): Promise<boolean> => {
      const dk = this.dedupeKey(tenantId, agentId, input);
      const existingId = this.dedupeKeys.get(dk);
      if (existingId) {
        const prev = this.jobs.get(existingId);
        if (prev && prev.state === "succeeded" && prev.tenantId === tenantId) {
          return true; // idempotent skip
        }
      }

      const id = await this.enqueue({
        tenantId,
        agentId,
        correlationId,
        traceId,
        priority: 50,
        payload: { input: input.slice(0, 8000), pattern: plan.pattern },
        maxAttempts: ORCHESTRATOR_RESILIENCE.deadLetterAfterAttempts,
        scheduledAt: nowIso(),
        parentJobId: null,
      });
      this.dedupeKeys.set(dk, id);
      const job = this.jobs.get(id)!;
      job.state = "running";
      job.startedAt = nowIso();
      job.attempts += 1;
      this.jobs.set(id, job);
      this.persist();

      try {
        const result = await Promise.race([
          this.executor({
            tenantId,
            agentId,
            correlationId,
            traceId,
            input: input.slice(0, 8000),
            pattern: plan.pattern,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("orchestrator_timeout")), plan.timeoutMs),
          ),
        ]);

        job.payload = {
          ...job.payload,
          result: result.output,
          validated: result.validated,
          mode: result.mode,
          acceptance: result.acceptance,
          evidence: result.evidence,
        };
        if (result.ok && result.validated) {
          job.state = "succeeded";
          job.lastError = null;
          this.circuitFailures.set(tenantId, 0);
        } else {
          job.state = "failed";
          job.lastError = result.error ?? "validation_failed";
          this.circuitFailures.set(tenantId, failures + 1);
        }
      } catch (e) {
        job.state = "failed";
        job.lastError = e instanceof Error ? e.message : "execute_failed";
        this.circuitFailures.set(tenantId, failures + 1);
      }
      job.finishedAt = nowIso();
      this.jobs.set(id, job);
      this.persist();
      return job.state === "succeeded";
    };

    let outcomes: boolean[];
    if (plan.pattern === "parallel_fanout") {
      outcomes = await Promise.all(agents.map((a) => runOne(a)));
    } else {
      outcomes = [];
      for (const a of agents) {
        const ok = await runOne(a);
        outcomes.push(ok);
        if (!ok && plan.requireAllSuccess) break;
      }
    }

    if (plan.requireAllSuccess && outcomes.some((o) => !o)) {
      // correlation still returned for traceability; caller inspects jobs
    }

    return correlationId;
  }

  listJobs(tenantId: string, limit = 50): OrchestratorJob[] {
    return [...this.jobs.values()]
      .filter((j) => j.tenantId === tenantId)
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .slice(0, limit);
  }

  /** Daemon drain: highest priority queued jobs across tenants (respects nextRetryAt). */
  drainQueuedJobs(limit = 4): OrchestratorJob[] {
    const now = Date.now();
    return [...this.jobs.values()]
      .filter((j) => {
        if (j.state !== "queued") return false;
        const next = j.payload.nextRetryAt;
        if (typeof next === "string" && Date.parse(next) > now) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority || a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, limit);
  }

  upsertJob(job: OrchestratorJob): void {
    this.jobs.set(job.jobId, job);
    this.persist();
  }

  resetCircuit(tenantId: string): void {
    this.circuitFailures.delete(tenantId);
  }
}

let _orch: IAgentOrchestrator | undefined;
let _override: IAgentOrchestrator | null = null;

export function setOrchestratorForTests(o: IAgentOrchestrator | null): void {
  _override = o;
}

export function getAgentOrchestrator(): IAgentOrchestrator {
  if (_override) return _override;
  if (!isOrchestratorEnabled()) return new UnimplementedOrchestrator();
  _orch ??= new InMemoryAgentOrchestrator();
  return _orch;
}

export function resetOrchestratorForTests(): void {
  _override = null;
  _orch = undefined;
}

export function assertOrchestratorEnabled(): void {
  if (!isOrchestratorEnabled()) throw new OrchestratorNotEnabledError();
}
