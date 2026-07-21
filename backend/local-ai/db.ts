import crypto from "node:crypto";
import pg from "pg";

import { getLocalAiConfig } from "./config";

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function vectorLiteral(values: number[]): string {
  return `[${values.map((v) => Number(v).toFixed(8)).join(",")}]`;
}

let pool: pg.Pool | null = null;

function poolMaxConnections(): number {
  const raw = process.env.LOCAL_AI_POOL_MAX;
  if (raw) return Math.max(1, Number(raw));
  // Sequential benchmark: one active connection is enough; avoids exhausting Postgres.
  return process.env.BENCHMARK_MODE === "1" ? 2 : 4;
}

export function getLocalAiPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: getLocalAiConfig().databaseUrl,
      max: poolMaxConnections(),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      allowExitOnIdle: true,
    });
    pool.on("error", (err: Error) => {
      console.error("[local-ai] pool idle client error:", err.message);
    });
  }
  return pool;
}

export type PoolStats = {
  total: number;
  idle: number;
  waiting: number;
};

export function getPoolStats(): PoolStats {
  const p = getLocalAiPool();
  return { total: p.totalCount, idle: p.idleCount, waiting: p.waitingCount };
}

/** Read-only tenant-scoped query — READ ONLY transaction so set_config(is_local) persists. */
export async function withTenantReadOnly<T>(
  tenantId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getLocalAiPool().connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback errors */
    }
    throw e;
  } finally {
    client.release();
  }
}

/** Writable tenant-scoped work — transactional. */
export async function withTenantClient<T>(
  tenantId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getLocalAiPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback errors */
    }
    throw e;
  } finally {
    client.release();
  }
}

export async function healthCheckPool(): Promise<{ ok: boolean; detail?: string; stats: PoolStats }> {
  const stats = getPoolStats();
  try {
    await getLocalAiPool().query("SELECT 1");
    return { ok: true, stats };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
      stats,
    };
  }
}

/** Wait for in-flight queries to finish without destroying the pool. */
export async function drainLocalAiPool(timeoutMs = 30_000): Promise<void> {
  if (!pool) return;
  const start = Date.now();
  while (pool.waitingCount > 0 || pool.totalCount - pool.idleCount > 0) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`pool_drain_timeout: total=${pool.totalCount} idle=${pool.idleCount} waiting=${pool.waitingCount}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

export async function closeLocalAiPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export function resetLocalAiPoolForTests(): void {
  pool = null;
}
