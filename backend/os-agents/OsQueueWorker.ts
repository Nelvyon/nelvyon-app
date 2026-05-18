import { DbClient } from "../db/DbClient";
import { getNelvyonEmailService } from "../email";
import { NelvyonMonitor } from "../monitoring";
import { osEventBus } from "./OsEventBus";
import { osJobStore } from "./OsJobStore";
import { osOrchestrator } from "./OsOrchestrator";
import { getOsQueue } from "./OsQueue";
import type { OsEventBus } from "./OsEventBus";
import type { OsJobStore } from "./OsJobStore";
import type { OsOrchestrator } from "./OsOrchestrator";
import type { OsQueue } from "./OsQueue";
import type { OsDispatchResult, OsQueueItem, OsWorkerStatus } from "./types";

const DEFAULT_POLL_MS = 2000;
const DEFAULT_MAX_CONCURRENT = 3;

function readIntEnv(name: string, fallback: number): number {
  const raw = typeof process !== "undefined" ? process.env[name] : undefined;
  if (typeof raw !== "string" || raw.trim().length === 0) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

class AsyncSlotPool {
  private free: number;
  private readonly waiters: Array<() => void> = [];

  constructor(slots: number) {
    this.free = slots;
  }

  acquire(): Promise<void> {
    if (this.free > 0) {
      this.free--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    if (this.waiters.length > 0) {
      const next = this.waiters.shift();
      next?.();
    } else {
      this.free++;
    }
  }
}

export type OsQueueWorkerDeps = {
  jobStore: OsJobStore;
  eventBus: OsEventBus;
  queue: OsQueue;
  orchestrator: OsOrchestrator;
};

/**
 * Background processor for `OsQueue`: bounded concurrency, resilient loop, startup recovery.
 */
export class OsQueueWorker {
  private static instance: OsQueueWorker | undefined;

  private readonly slots: AsyncSlotPool;
  private readonly pollMs: number;
  private stopRequested = false;
  private loopPromise: Promise<void> | undefined;
  private inflight = 0;
  private status: OsWorkerStatus = {
    running: false,
    processed: 0,
    failed: 0,
    lastJobId: null,
  };

  private constructor(
    private readonly jobStore: OsJobStore,
    private readonly eventBus: OsEventBus,
    private readonly queue: OsQueue,
    private readonly orchestrator: OsOrchestrator,
  ) {
    this.pollMs = readIntEnv("WORKER_POLL_MS", DEFAULT_POLL_MS);
    this.slots = new AsyncSlotPool(readIntEnv("MAX_CONCURRENT_JOBS", DEFAULT_MAX_CONCURRENT));
  }

  static getInstance(deps?: OsQueueWorkerDeps): OsQueueWorker {
    if (!OsQueueWorker.instance) {
      if (deps) {
        OsQueueWorker.instance = new OsQueueWorker(deps.jobStore, deps.eventBus, deps.queue, deps.orchestrator);
      } else {
        OsQueueWorker.instance = new OsQueueWorker(osJobStore, osEventBus, getOsQueue(), osOrchestrator);
      }
    }
    return OsQueueWorker.instance;
  }

  static async teardownForTests(): Promise<void> {
    if (!OsQueueWorker.instance) return;
    await OsQueueWorker.instance.stop();
    OsQueueWorker.instance = undefined;
  }

  getStatus(): OsWorkerStatus {
    return { ...this.status };
  }

  start(): void {
    if (this.status.running) return;
    this.stopRequested = false;
    this.status.running = true;
    void this.recoverStaleJobs()
      .catch((e) => console.error("[OsQueueWorker] recovery failed", e))
      .finally(() => {
        this.loopPromise = this.runLoop();
      });
  }

  async stop(): Promise<void> {
    if (!this.status.running) return;
    this.stopRequested = true;
    if (this.loopPromise) {
      await this.loopPromise.catch(() => undefined);
    }
    while (this.inflight > 0) {
      await sleep(25);
    }
    this.status.running = false;
    this.loopPromise = undefined;
  }

  private async recoverStaleJobs(): Promise<void> {
    const jobs = await this.jobStore.listJobs();
    for (const j of jobs) {
      if (j.status === "queued") {
        const item: OsQueueItem = {
          jobId: j.jobId,
          serviceId: j.serviceId,
          clientId: j.clientId,
          payload: j.payload,
          enqueuedAt: new Date().toISOString(),
        };
        await this.queue.enqueue(item);
      } else if (j.status === "running") {
        await this.jobStore.failJob(j.jobId, "Server restart — job interrupted", undefined);
        this.eventBus.emit("job:failed", {
          jobId: j.jobId,
          error: { message: "Server restart — job interrupted" },
        });
      }
    }
  }

  private async runLoop(): Promise<void> {
    while (!this.stopRequested) {
      await this.slots.acquire();
      const item = await this.queue.dequeue();
      if (!item) {
        this.slots.release();
        await this.interruptibleSleep(this.pollMs);
        continue;
      }
      this.inflight++;
      void this.processItem(item).finally(() => {
        this.inflight--;
        this.slots.release();
      });
    }
    while (this.inflight > 0) {
      await sleep(25);
    }
  }

  private async interruptibleSleep(ms: number): Promise<void> {
    const slice = 50;
    let left = ms;
    while (left > 0 && !this.stopRequested) {
      const chunk = Math.min(slice, left);
      await sleep(chunk);
      left -= chunk;
    }
  }

  private async processItem(item: OsQueueItem): Promise<void> {
    this.status.lastJobId = item.jobId;
    try {
      const result = await this.orchestrator.processQueuedJob(item);
      if (result.skipped) {
        return;
      }
      if (result.status === "completed") {
        this.status.processed++;
        void this.sendCompletedEmail(item, result).catch((e) => {
          console.error("[Email] job completed send failed:", e);
        });
        this.eventBus.emit("worker:processed", {
          jobId: item.jobId,
          serviceId: item.serviceId,
          clientId: item.clientId,
        });
      } else {
        this.status.failed++;
        this.eventBus.emit("worker:failed", {
          jobId: item.jobId,
          serviceId: item.serviceId,
          clientId: item.clientId,
          error: result.message,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[OsQueueWorker] job failed", item.jobId, msg);
      NelvyonMonitor.trackJobFailed(item.jobId, item.serviceId, err);
      this.status.failed++;
      this.eventBus.emit("worker:failed", {
        jobId: item.jobId,
        serviceId: item.serviceId,
        clientId: item.clientId,
        error: msg,
      });
    }
  }

  private async sendCompletedEmail(item: OsQueueItem, result: OsDispatchResult): Promise<void> {
    const db = DbClient.getInstance();
    const authRows = await db.query<{ email: string; full_name: string | null }>(
      `SELECT email, full_name FROM os_users WHERE tenant_id = $1 LIMIT 1`,
      [item.clientId],
    );
    const fallbackRows = authRows.length
      ? authRows
      : await db.query<{ email: string; full_name: string | null }>(
          `SELECT email, full_name FROM nelvyon_users WHERE tenant_id = $1 LIMIT 1`,
          [item.clientId],
        );
    const user = fallbackRows[0];
    if (!user?.email) return;
    const summary = typeof result.message === "string" ? result.message : "Tu job fue completado.";
    await getNelvyonEmailService().sendJobCompleted(
      user.email,
      user.full_name?.trim() || "Cliente",
      item.serviceId,
      item.jobId,
      summary,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

let workerStarted = false;

export function initOsQueueWorker(): void {
  if (workerStarted) return;
  workerStarted = true;
  OsQueueWorker.getInstance().start();
}

export function resetInitOsQueueWorkerForTests(): void {
  workerStarted = false;
}

export async function resetOsQueueWorkerForTests(): Promise<void> {
  await OsQueueWorker.teardownForTests();
  resetInitOsQueueWorkerForTests();
}
