import { RedisClient } from "../db/RedisClient";
import type { OsJobPayload, OsQueueItem } from "./types";

const REDIS_QUEUE_KEY = "os:queue";
const REDIS_QUEUE_TTL_SECONDS = 24 * 60 * 60;

function hasRedisUrl(): boolean {
  const u = typeof process !== "undefined" ? process.env.REDIS_URL : undefined;
  return typeof u === "string" && u.trim().length > 0;
}

/**
 * FIFO OS job queue: in-memory by default; Redis list (`os:queue`) when `REDIS_URL` is set.
 * Serialized access for memory path; Redis path uses RPUSH/LPOP and refreshes key TTL on enqueue.
 */
export class OsQueue {
  private readonly redis: RedisClient | null;
  private memoryTail = Promise.resolve();
  private readonly memoryItems: OsQueueItem[] = [];

  constructor(redis: RedisClient | null = hasRedisUrl() ? RedisClient.getInstance() : null) {
    this.redis = redis;
  }

  async enqueue(item: OsQueueItem): Promise<void> {
    if (this.redis) {
      const raw = JSON.stringify(item);
      await this.redis.rpush(REDIS_QUEUE_KEY, raw);
      await this.redis.expire(REDIS_QUEUE_KEY, REDIS_QUEUE_TTL_SECONDS);
      return;
    }
    await this.withMemoryLock(async () => {
      this.memoryItems.push(item);
    });
  }

  async dequeue(): Promise<OsQueueItem | null> {
    if (this.redis) {
      const raw = await this.redis.lpop(REDIS_QUEUE_KEY);
      return parseItem(raw);
    }
    return this.withMemoryLock(async () => this.memoryItems.shift() ?? null);
  }

  async size(): Promise<number> {
    if (this.redis) {
      return this.redis.llen(REDIS_QUEUE_KEY);
    }
    return this.withMemoryLock(async () => this.memoryItems.length);
  }

  async peek(): Promise<OsQueueItem | null> {
    if (this.redis) {
      const raw = await this.redis.lindex(REDIS_QUEUE_KEY, 0);
      return parseItem(raw);
    }
    return this.withMemoryLock(async () => this.memoryItems[0] ?? null);
  }

  private async withMemoryLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.memoryTail.then(fn);
    this.memoryTail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

function parseItem(raw: string | null): OsQueueItem | null {
  if (raw === null || raw.length === 0) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!isQueueItem(v)) return null;
    return v;
  } catch {
    return null;
  }
}

function isQueueItem(v: unknown): v is OsQueueItem {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.jobId === "string" &&
    typeof o.serviceId === "string" &&
    typeof o.clientId === "string" &&
    typeof o.enqueuedAt === "string" &&
    isPlainPayload(o.payload)
  );
}

function isPlainPayload(v: unknown): v is OsJobPayload {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

let queueSingleton: OsQueue | undefined;

export function getOsQueue(): OsQueue {
  if (!queueSingleton) {
    queueSingleton = new OsQueue();
  }
  return queueSingleton;
}

export function resetOsQueueForTests(): void {
  queueSingleton = undefined;
}
