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

export function getLocalAiPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: getLocalAiConfig().databaseUrl,
      max: 8,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

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
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
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
