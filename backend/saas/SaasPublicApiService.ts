import { createHash, randomBytes } from "node:crypto";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { RedisClient } from "../db/RedisClient";
import { RedisClient as RedisClientClass } from "../db/RedisClient";
import { logger } from "../os-agents/cron/logger";

export interface ApiKeyConfig {
  id: string;
  userId: string;
  keyHash: string;
  name: string | null;
  isActive: boolean;
  rateLimitPerHour: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface UsageStats {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgResponseMs: number;
}

type RedisPort = Pick<RedisClient, "get" | "set" | "expire">;

export type SaasPublicApiServiceDeps = {
  db?: Pick<DbClient, "query">;
  redis?: RedisPort;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export class SaasPublicApiService {
  constructor(private readonly deps: SaasPublicApiServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get redis(): RedisPort {
    return this.deps.redis ?? RedisClientClass.getInstance();
  }

  async generateApiKey(userId: string, name: string): Promise<{ key: string; config: ApiKeyConfig }> {
    const key = `nlv_${randomBytes(16).toString("hex")}`;
    const keyHash = sha256(key);
    const rows = await this.db.query<ApiKeyConfig>(
      `INSERT INTO saas_api_keys (user_id, key_hash, name)
       VALUES ($1::uuid, $2, $3)
       RETURNING id, user_id::text as "userId", key_hash as "keyHash",
                 name, is_active as "isActive", rate_limit_per_hour as "rateLimitPerHour",
                 last_used_at as "lastUsedAt", created_at as "createdAt"`,
      [userId, keyHash, name || null],
    );
    const config = rows[0];
    if (!config) throw new Error("SaasPublicApiService.generateApiKey: INSERT returned no row");
    return { key, config };
  }

  async validateApiKey(rawKey: string): Promise<ApiKeyConfig | null> {
    if (!/^nlv_[a-f0-9]{32}$/.test(rawKey)) return null;
    const keyHash = sha256(rawKey);
    const rows = await this.db.query<ApiKeyConfig>(
      `SELECT id, user_id::text as "userId", key_hash as "keyHash",
              name, is_active as "isActive", rate_limit_per_hour as "rateLimitPerHour",
              last_used_at as "lastUsedAt", created_at as "createdAt"
       FROM saas_api_keys WHERE key_hash = $1`,
      [keyHash],
    );
    const apiKey = rows[0];
    if (!apiKey || !apiKey.isActive) return null;
    await this.db.query(`UPDATE saas_api_keys SET last_used_at = NOW() WHERE id = $1::uuid`, [apiKey.id]);
    return apiKey;
  }

  async checkRateLimit(apiKeyId: string, limitPerHour: number): Promise<boolean> {
    const redisKey = `api:rate:${apiKeyId}`;
    const currentRaw = await this.redis.get(redisKey);
    const current = currentRaw ? Number.parseInt(currentRaw, 10) : 0;
    const next = current + 1;
    await this.redis.set(redisKey, String(next));
    if (!currentRaw) {
      await this.redis.expire(redisKey, 3600);
    }
    return next <= limitPerHour;
  }

  async getRateLimitRemaining(apiKeyId: string, limitPerHour: number): Promise<number> {
    const redisKey = `api:rate:${apiKeyId}`;
    const currentRaw = await this.redis.get(redisKey);
    const current = currentRaw ? Number.parseInt(currentRaw, 10) : 0;
    return Math.max(0, limitPerHour - current);
  }

  async logUsage(apiKeyId: string, endpoint: string, method: string, statusCode: number, responseMs: number): Promise<void> {
    await this.db.query(
      `INSERT INTO saas_api_usage (api_key_id, endpoint, method, status_code, response_ms)
       VALUES ($1::uuid, $2, $3, $4, $5)`,
      [apiKeyId, endpoint, method, statusCode, responseMs],
    );
  }

  async listApiKeys(userId: string): Promise<ApiKeyConfig[]> {
    return this.db.query<ApiKeyConfig>(
      `SELECT id, user_id::text as "userId", key_hash as "keyHash",
              name, is_active as "isActive", rate_limit_per_hour as "rateLimitPerHour",
              last_used_at as "lastUsedAt", created_at as "createdAt"
       FROM saas_api_keys WHERE user_id = $1::uuid ORDER BY created_at DESC`,
      [userId],
    );
  }

  async revokeApiKey(apiKeyId: string, userId: string): Promise<void> {
    await this.db.query(`UPDATE saas_api_keys SET is_active = false WHERE id = $1::uuid AND user_id = $2::uuid`, [apiKeyId, userId]);
  }

  async getUsageStats(apiKeyId: string, days: number = 30): Promise<UsageStats> {
    const safeDays = Math.min(365, Math.max(1, Math.floor(days)));
    const rows = await this.db.query<{ total_calls: string; success_calls: string; error_calls: string; avg_response_ms: string | null }>(
      `SELECT
         COUNT(*)::text as total_calls,
         COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::text as success_calls,
         COUNT(*) FILTER (WHERE status_code >= 400)::text as error_calls,
         AVG(response_ms)::text as avg_response_ms
       FROM saas_api_usage
       WHERE api_key_id = $1::uuid AND created_at >= NOW() - ($2::text || ' days')::interval`,
      [apiKeyId, String(safeDays)],
    );
    const row = rows[0];
    return {
      totalCalls: Number.parseInt(row?.total_calls ?? "0", 10),
      successCalls: Number.parseInt(row?.success_calls ?? "0", 10),
      errorCalls: Number.parseInt(row?.error_calls ?? "0", 10),
      avgResponseMs: row?.avg_response_ms ? Number.parseFloat(row.avg_response_ms) : 0,
    };
  }
}

export const saasPublicApiService = new SaasPublicApiService();

export function maskApiKey(key: string): string {
  if (!key.startsWith("nlv_")) return key;
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export function isPublicApiKeyFormat(rawKey: string): boolean {
  return /^nlv_[a-f0-9]{32}$/.test(rawKey);
}

export function hashApiKey(rawKey: string): string {
  return sha256(rawKey);
}

export function buildRateRedisKey(apiKeyId: string): string {
  return `api:rate:${apiKeyId}`;
}

export function logPublicApiAuthResult(ok: boolean, apiKeyId?: string): void {
  logger.info(`[PUBLIC API] auth=${ok ? "ok" : "fail"}${apiKeyId ? ` key=${apiKeyId}` : ""}`);
}
