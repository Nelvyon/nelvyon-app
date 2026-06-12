import pg from "pg";

import { isSupabaseHost, sanitizeEnvValue } from "./envSanitize";

// Singleton Postgres pool for OS persistence and reporting queries.
// MIG 279 (RLS): DATABASE_URL must use the Supabase service_role URL (bypasses RLS). NEVER use the anon key.

let dbClientSingleton: DbClient | undefined;

function poolOptions(connectionString: string): pg.PoolConfig {
  const config: pg.PoolConfig = {
    connectionString,
    connectionTimeoutMillis: 10_000,
  };
  try {
    const normalized = connectionString.replace(/^postgresql\+asyncpg:/, "postgresql:");
    const host = new URL(normalized).hostname;
    if (isSupabaseHost(host)) {
      config.ssl = { rejectUnauthorized: false };
    }
  } catch {
    /* keep default pool config */
  }
  return config;
}

export class DbClient {
  private readonly pool: pg.Pool;

  private constructor(connectionString: string) {
    this.pool = new pg.Pool(poolOptions(connectionString));
  }

  static getInstance(): DbClient {
    if (dbClientSingleton) {
      return dbClientSingleton;
    }
    const url = sanitizeEnvValue(process.env.DATABASE_URL);
    if (url.length === 0) {
      throw new Error(
        "DbClient: DATABASE_URL is not defined or empty. Set DATABASE_URL to the Supabase service_role Postgres URL (bypasses RLS).",
      );
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && url.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
      throw new Error("DbClient: DATABASE_URL must not reference the anon key. Use service_role.");
    }
    dbClientSingleton = new DbClient(url);
    return dbClientSingleton;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async end(): Promise<void> {
    await this.pool.end();
    dbClientSingleton = undefined;
  }
}
