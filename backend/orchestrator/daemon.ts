/**
 * Orchestrator daemon — supervised poll loop independent of Cursor IDE.
 * Flag: NELVYON_ORCHESTRATOR_DAEMON=1
 * Persist: NELVYON_ORCH_PERSIST_DIR (required for restart recovery)
 */

import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { InMemoryAgentOrchestrator } from "./runtime";
import { sandboxJobExecutor } from "./jobExecutor";
import { ORCHESTRATOR_RESILIENCE } from "./contracts";
import {
  getGlobalOperationMode,
  isEmergencyStopped,
} from "../agents/workforce/operationModes";

export type DaemonHealth = {
  status: "ok" | "stopped" | "paused" | "emergency_stop" | "degraded";
  running: boolean;
  paused: boolean;
  ready: boolean;
  live: boolean;
  workerId: string;
  uptimeMs: number;
  ticks: number;
  lastTickAt: string | null;
  jobsProcessed: number;
  lastError: string | null;
};

export type DaemonOptions = {
  pollIntervalMs?: number;
  leaseMs?: number;
  maxJobsPerTick?: number;
  healthDir?: string | null;
};

export class OrchestratorDaemon {
  readonly workerId = `orch-daemon-${randomUUID().slice(0, 8)}`;
  private running = false;
  private paused = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private ticks = 0;
  private jobsProcessed = 0;
  private lastTickAt: string | null = null;
  private lastError: string | null = null;
  private readonly pollIntervalMs: number;
  private readonly leaseMs: number;
  private readonly maxJobsPerTick: number;
  private readonly healthDir: string | null;

  constructor(
    private readonly orch: InMemoryAgentOrchestrator,
    opts: DaemonOptions = {},
  ) {
    this.pollIntervalMs = opts.pollIntervalMs ?? Number(process.env.NELVYON_ORCH_POLL_MS ?? 2000);
    this.leaseMs = opts.leaseMs ?? Number(process.env.NELVYON_ORCH_LEASE_MS ?? 30_000);
    this.maxJobsPerTick = opts.maxJobsPerTick ?? 4;
    this.healthDir =
      opts.healthDir !== undefined
        ? opts.healthDir
        : process.env.NELVYON_ORCH_HEALTH_DIR?.trim() || null;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = Date.now();
    this.writeHealth();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
    if (typeof this.timer.unref === "function") this.timer.unref();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.paused = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.writeHealth();
  }

  pause(): void {
    this.paused = true;
    this.writeHealth();
  }

  resume(): void {
    this.paused = false;
    this.writeHealth();
  }

  health(): DaemonHealth {
    const live = this.running && this.lastTickAt !== null;
    const ready = this.running && !this.paused && !isEmergencyStopped();
    const base = {
      running: this.running,
      paused: this.paused,
      ready,
      live,
      workerId: this.workerId,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : 0,
      ticks: this.ticks,
      lastTickAt: this.lastTickAt,
      jobsProcessed: this.jobsProcessed,
      lastError: this.lastError,
    };
    if (isEmergencyStopped()) return { ...base, status: "emergency_stop" as const };
    if (this.paused) return { ...base, status: "paused" as const };
    return { ...base, status: this.running ? ("ok" as const) : ("stopped" as const) };
  }

  async tick(): Promise<{ processed: number }> {
    this.ticks += 1;
    this.lastTickAt = new Date().toISOString();
    if (!this.running || this.paused) {
      this.writeHealth();
      return { processed: 0 };
    }
    if (isEmergencyStopped() || getGlobalOperationMode() === "emergency_stop") {
      this.writeHealth();
      return { processed: 0 };
    }

    let processed = 0;
    try {
      const jobs = this.orch.drainQueuedJobs(this.maxJobsPerTick);
      for (const job of jobs) {
        const leaseUntil = new Date(Date.now() + this.leaseMs).toISOString();
        job.state = "running";
        job.startedAt = new Date().toISOString();
        job.attempts += 1;
        job.payload = {
          ...job.payload,
          leaseOwner: this.workerId,
          leaseUntil,
          heartbeatAt: new Date().toISOString(),
        };
        this.orch.upsertJob(job);

        try {
          const input = String(job.payload.input ?? "");
          const result = await sandboxJobExecutor({
            tenantId: job.tenantId,
            agentId: job.agentId,
            correlationId: job.correlationId,
            traceId: job.traceId,
            input,
            pattern: String(job.payload.pattern ?? "daemon"),
          });
          if (result.ok && result.validated) {
            job.state = "succeeded";
            job.lastError = null;
            job.payload = {
              ...job.payload,
              result: result.output,
              validated: true,
              mode: result.mode,
            };
          } else if (job.attempts >= job.maxAttempts) {
            job.state = "dead_letter";
            job.lastError = result.error ?? "validation_failed";
          } else {
            const backoff =
              ORCHESTRATOR_RESILIENCE.retryBackoffMs[
                Math.min(job.attempts - 1, ORCHESTRATOR_RESILIENCE.retryBackoffMs.length - 1)
              ] ?? 8000;
            job.state = "queued";
            job.payload = {
              ...job.payload,
              retrying: true,
              nextRetryAt: new Date(Date.now() + backoff).toISOString(),
              lastFail: result.error ?? "validation_failed",
            };
            job.lastError = result.error ?? "validation_failed";
          }
        } catch (e) {
          job.lastError = e instanceof Error ? e.message : "daemon_exec_failed";
          if (job.attempts >= job.maxAttempts) job.state = "dead_letter";
          else job.state = "queued";
        }
        job.finishedAt =
          job.state === "succeeded" || job.state === "dead_letter" ? new Date().toISOString() : null;
        if (job.state === "queued") job.startedAt = null;
        this.orch.upsertJob(job);
        processed += 1;
        this.jobsProcessed += 1;
      }
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
    }
    this.writeHealth();
    return { processed };
  }

  private writeHealth(): void {
    if (!this.healthDir) return;
    try {
      mkdirSync(this.healthDir, { recursive: true });
      writeFileSync(
        join(this.healthDir, "orchestrator_daemon_health.json"),
        JSON.stringify(this.health(), null, 2),
      );
    } catch {
      /* ignore */
    }
  }
}

export function readDaemonHealthFile(healthDir: string): DaemonHealth | null {
  const p = join(healthDir, "orchestrator_daemon_health.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as DaemonHealth;
  } catch {
    return null;
  }
}

export function isOrchestratorDaemonEnabled(): boolean {
  const v = process.env.NELVYON_ORCHESTRATOR_DAEMON ?? "0";
  return v === "1" || v.toLowerCase() === "true";
}
