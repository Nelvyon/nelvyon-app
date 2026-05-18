import Redis from "ioredis";

const DEFAULT_ACTIVE_JOB_TTL_SECONDS = 3600;

/**
 * Singleton Redis client for hot caching of active OS jobs (queued/running).
 * Exists to avoid hammering Postgres on high-frequency status reads; TTL evicts stale cache keys.
 * Depends on `REDIS_URL` (throws from getInstance if unset).
 */
export class RedisClient {
  private static instance: RedisClient | undefined;
  private readonly client: Redis;

  private constructor(url: string) {
    this.client = new Redis(url.trim(), { maxRetriesPerRequest: 2, enableReadyCheck: true });
  }

  static getInstance(): RedisClient {
    if (RedisClient.instance) {
      return RedisClient.instance;
    }
    const url = process.env.REDIS_URL;
    if (typeof url !== "string" || url.trim().length === 0) {
      throw new Error(
        "RedisClient: REDIS_URL is not defined or empty. Set REDIS_URL (e.g. redis://localhost:6379) when using Redis-backed OS job cache.",
      );
    }
    RedisClient.instance = new RedisClient(url.trim());
    return RedisClient.instance;
  }

  /** Sets a string value; optional TTL defaults to 1 hour for active job payloads. */
  async set(key: string, value: string, ttlSeconds: number = DEFAULT_ACTIVE_JOB_TTL_SECONDS): Promise<void> {
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    const v = await this.client.get(key);
    return v;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** List tail push (FIFO consumer uses LPOP from head). */
  async rpush(key: string, value: string): Promise<void> {
    await this.client.rpush(key, value);
  }

  async lpop(key: string): Promise<string | null> {
    const v = await this.client.lpop(key);
    return v;
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  async lindex(key: string, index: number): Promise<string | null> {
    const v = await this.client.lindex(key, index);
    return v;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async end(): Promise<void> {
    await this.client.quit();
    RedisClient.instance = undefined;
  }
}

export const OS_JOB_REDIS_TTL_SECONDS = DEFAULT_ACTIVE_JOB_TTL_SECONDS;
