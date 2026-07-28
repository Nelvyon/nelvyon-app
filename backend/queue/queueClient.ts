import { Redis } from "@upstash/redis";

import { osOrchestrator } from "../os-agents/OsOrchestrator";
import type { JobStatus, OsQueueEnqueueInput, OsQueueWorkItem, QueueJobStatus } from "./types";

const QUEUE_LIST_KEY = "os:async:queue";
const PROCESSING_LIST_KEY = "os:async:processing";
const JOB_KEY_PREFIX = "os:async:job:";
const JOB_TTL_SECONDS = 24 * 60 * 60;
/** In-memory fallback (no Upstash): hard cap + TTL mirror Redis retention. */
const MEMORY_JOB_CAP = 5_000;
const MEMORY_JOB_TTL_MS = JOB_TTL_SECONDS * 1000;

function jobKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildJobId(userId: string): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return `os_${safeUser}_${crypto.randomUUID()}`;
}

function parseUserIdFromJobId(jobId: string): string | null {
  if (!jobId.startsWith("os_")) return null;
  const rest = jobId.slice(3);
  const lastUnderscore = rest.lastIndexOf("_");
  if (lastUnderscore <= 0) return null;
  return rest.slice(0, lastUnderscore);
}

export function isAsyncQueueEnabled(): boolean {
  return process.env.ASYNC_QUEUE_ENABLED !== "false";
}

function getUpstashRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_TOKEN;
  if (!url?.trim() || !token?.trim()) return null;
  return new Redis({ url: url.trim(), token: token.trim() });
}

/**
 * Upstash-backed OS job queue (HTTP REST). Singleton; 24h TTL on job metadata.
 */
export class QueueClient {
  private static instance: QueueClient | undefined;
  private readonly redis: Redis | null;
  private readonly memoryQueue: OsQueueWorkItem[] = [];
  private readonly memoryJobs = new Map<string, JobStatus>();

  private constructor(redis: Redis | null) {
    this.redis = redis;
  }

  static getInstance(): QueueClient {
    if (!QueueClient.instance) {
      QueueClient.instance = new QueueClient(getUpstashRedis());
    }
    return QueueClient.instance;
  }

  static resetForTests(): void {
    QueueClient.instance = undefined;
  }

  /** Creates job in store, registers metadata, LPUSH to Upstash list. */
  async enqueue(input: OsQueueEnqueueInput): Promise<string> {
    const jobId = buildJobId(input.userId);
    const dispatch = await osOrchestrator.enqueueAndDispatch(
      {
        jobId,
        serviceId: input.serviceId,
        clientId: input.clientId,
        payload: input.payload,
        userId: input.userId,
      },
      { skipQueue: true },
    );

    if (dispatch.status === "failed" || !dispatch.jobId) {
      throw new Error(dispatch.message || "Failed to enqueue job");
    }

    const resolvedJobId = dispatch.jobId;
    const ts = nowIso();
    const record: JobStatus = {
      status: "pending",
      userId: input.userId,
      serviceId: input.serviceId,
      clientId: input.clientId,
      createdAt: ts,
      updatedAt: ts,
    };

    const item: OsQueueWorkItem = {
      jobId: resolvedJobId,
      serviceId: input.serviceId,
      clientId: input.clientId,
      payload: input.payload,
      userId: input.userId,
      enqueuedAt: ts,
    };

    await this.saveJobStatus(resolvedJobId, record);
    await this.pushQueueItem({ ...item, jobId: resolvedJobId });

    return resolvedJobId;
  }

  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    if (this.redis) {
      const raw = await this.redis.get<JobStatus>(jobKey(jobId));
      if (raw && typeof raw === "object") return raw as JobStatus;
      return null;
    }
    return this.memoryJobs.get(jobId) ?? null;
  }

  async setJobStatus(jobId: string, status: QueueJobStatus): Promise<void> {
    const existing = (await this.getJobStatus(jobId)) ?? {
      status: "pending" as const,
      userId: parseUserIdFromJobId(jobId) ?? "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.saveJobStatus(jobId, {
      ...existing,
      status,
      updatedAt: nowIso(),
    });
  }

  async setJobResult(jobId: string, result: unknown): Promise<void> {
    const existing = await this.getJobStatus(jobId);
    if (!existing) return;
    await this.saveJobStatus(jobId, {
      ...existing,
      status: "completed",
      result,
      error: undefined,
      updatedAt: nowIso(),
    });
  }

  async setJobFailed(jobId: string, error: string): Promise<void> {
    const existing = await this.getJobStatus(jobId);
    if (!existing) return;
    await this.saveJobStatus(jobId, {
      ...existing,
      status: "failed",
      error,
      updatedAt: nowIso(),
    });
  }

  async dequeue(): Promise<OsQueueWorkItem | null> {
    if (this.redis) {
      const raw = await this.redis.lmove<string>(QUEUE_LIST_KEY, PROCESSING_LIST_KEY, "right", "left");
      if (!raw) return null;
      const item = parseWorkItem(raw);
      if (!item) return null;
      await this.setJobStatus(item.jobId, "processing");
      return item;
    }
    const item = this.memoryQueue.shift() ?? null;
    if (item) {
      await this.setJobStatus(item.jobId, "processing");
    }
    return item;
  }

  /** Remove a job from the processing list after worker completion (Redis only). */
  async acknowledgeDequeued(item: OsQueueWorkItem): Promise<void> {
    if (!this.redis) return;
    const raw = JSON.stringify(item);
    await this.redis.lrem(PROCESSING_LIST_KEY, 1, raw);
  }

  async jobBelongsToUser(jobId: string, userId: string): Promise<boolean> {
    const status = await this.getJobStatus(jobId);
    if (status?.userId === userId) return true;
    const fromId = parseUserIdFromJobId(jobId);
    const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    return fromId === safe || fromId === userId;
  }

  private pruneMemoryJobs(now = Date.now()): void {
    for (const [id, record] of this.memoryJobs) {
      const updated = Date.parse(record.updatedAt || record.createdAt);
      if (Number.isFinite(updated) && now - updated > MEMORY_JOB_TTL_MS) {
        this.memoryJobs.delete(id);
      }
    }
    if (this.memoryJobs.size <= MEMORY_JOB_CAP) return;
    const oldest = [...this.memoryJobs.entries()].sort(
      (a, b) => Date.parse(a[1].updatedAt || a[1].createdAt) - Date.parse(b[1].updatedAt || b[1].createdAt),
    );
    const drop = this.memoryJobs.size - MEMORY_JOB_CAP;
    for (let i = 0; i < drop; i++) {
      this.memoryJobs.delete(oldest[i]![0]);
    }
  }

  private async saveJobStatus(jobId: string, record: JobStatus): Promise<void> {
    if (this.redis) {
      await this.redis.set(jobKey(jobId), record, { ex: JOB_TTL_SECONDS });
      return;
    }
    this.pruneMemoryJobs();
    this.memoryJobs.set(jobId, record);
  }

  private async pushQueueItem(item: OsQueueWorkItem): Promise<void> {
    const raw = JSON.stringify(item);
    if (this.redis) {
      await this.redis.lpush(QUEUE_LIST_KEY, raw);
      await this.redis.expire(QUEUE_LIST_KEY, JOB_TTL_SECONDS);
      return;
    }
    // Cap pending queue length (completed jobs live in memoryJobs with TTL).
    if (this.memoryQueue.length >= MEMORY_JOB_CAP) {
      this.memoryQueue.shift();
    }
    this.memoryQueue.push(item);
  }
}

function parseWorkItem(raw: string): OsQueueWorkItem | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (typeof v !== "object" || v === null) return null;
    const o = v as Record<string, unknown>;
    if (
      typeof o.jobId === "string" &&
      typeof o.serviceId === "string" &&
      typeof o.clientId === "string" &&
      typeof o.userId === "string" &&
      typeof o.enqueuedAt === "string" &&
      typeof o.payload === "object" &&
      o.payload !== null
    ) {
      return o as unknown as OsQueueWorkItem;
    }
    return null;
  } catch {
    return null;
  }
}

export { parseUserIdFromJobId, buildJobId };
