import { createLogger } from "../logger";
import { osOrchestrator, sectorFromServiceId } from "../os-agents/OsOrchestrator";
import type { OsQueueItem } from "../os-agents/types";
import { QueueClient } from "./queueClient";
import type { OsQueueWorkItem } from "./types";

const DEFAULT_POLL_MS = 2000;

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

class SlotPool {
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
    const next = this.waiters.shift();
    if (next) next();
    else this.free++;
  }
}

let pollTimer: ReturnType<typeof setInterval> | undefined;
let running = false;
let slots: SlotPool | undefined;
let inflight = 0;

const workerLog = createLogger("osWorker");

function getSlots(): SlotPool {
  if (!slots) {
    slots = new SlotPool(readIntEnv("MAX_CONCURRENT_JOBS", 3));
  }
  return slots;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processItem(item: OsQueueWorkItem): Promise<void> {
  const client = QueueClient.getInstance();
  await client.setJobStatus(item.jobId, "processing");

  const queueItem: OsQueueItem = {
    jobId: item.jobId,
    serviceId: item.serviceId,
    clientId: item.clientId,
    payload: item.payload,
    enqueuedAt: item.enqueuedAt,
    userId: item.userId,
  };

  const sector = sectorFromServiceId(item.serviceId);
  const startedAt = Date.now();
  workerLog.info("job_processing_start", { jobId: item.jobId, sector, userId: item.userId });

  try {
    const result = await osOrchestrator.processQueuedJob(queueItem);
    if (result.skipped) return;

    if (result.status === "completed") {
      await client.setJobResult(item.jobId, result.result ?? { message: result.message });
    } else {
      await client.setJobFailed(item.jobId, result.message ?? "Job failed");
    }
    workerLog.info("job_processing_complete", { jobId: item.jobId, durationMs: Date.now() - startedAt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await client.setJobFailed(item.jobId, msg);
    workerLog.error(
      "job_processing_failed",
      { jobId: item.jobId, error: msg },
      err instanceof Error ? err : undefined,
    );
  }
}

async function pollOnce(): Promise<void> {
  if (!running) return;

  await getSlots().acquire();
  const client = QueueClient.getInstance();
  const item = await client.dequeue();
  if (!item) {
    getSlots().release();
    return;
  }

  inflight++;
  void processItem(item)
    .catch((e) =>
      workerLog.error(
        "job_processing_failed",
        { jobId: item.jobId, error: e instanceof Error ? e.message : String(e) },
        e instanceof Error ? e : undefined,
      ),
    )
    .finally(() => {
      inflight--;
      getSlots().release();
    });
}

export function startOsWorker(): void {
  if (running) return;
  slots = new SlotPool(readIntEnv("MAX_CONCURRENT_JOBS", 3));
  running = true;
  const pollMs = readIntEnv("WORKER_POLL_MS", DEFAULT_POLL_MS);
  void pollOnce();
  pollTimer = setInterval(() => {
    void pollOnce();
  }, pollMs);
}

export async function stopOsWorker(): Promise<void> {
  running = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
  while (inflight > 0) {
    await sleep(25);
  }
}

export function initOsQueueWorker(): void {
  startOsWorker();
}
