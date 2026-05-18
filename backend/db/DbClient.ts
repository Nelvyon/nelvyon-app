import pg from "pg";

/**
 * Singleton Postgres pool for OS persistence and reporting queries.
 * Exists to centralize connection lifecycle and typed query helpers for Db-backed stores.
 *
 * MIG 279 (RLS): use `DATABASE_URL` with the Supabase **service_role** connection string
 * (or another role that bypasses RLS). The backend must NEVER use the anon key.
 * Set `SUPABASE_SERVICE_ROLE_KEY` for optional Supabase REST; this pool uses `DATABASE_URL` only.
 */
export class DbClient {
  private static instance: DbClient | undefined;
  private readonly pool: pg.Pool;

  private constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  static getInstance(): DbClient {
    if (DbClient.instance) {
      return DbClient.instance;
    }
    const url = process.env.DATABASE_URL;
    if (typeof url !== "string" || url.trim().length === 0) {
      throw new Error(
        "DbClient: DATABASE_URL is not defined or empty. Set DATABASE_URL to the Supabase service_role Postgres URL (bypasses RLS).",
      );
    }
    const trimmed = url.trim();
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && trimmed.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
      throw new Error("DbClient: DATABASE_URL must not reference the anon key. Use service_role.");
    }
    DbClient.instance = new DbClient(trimmed);
    return DbClient.instance;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async end(): Promise<void> {
    await this.pool.end();
    DbClient.instance = undefined;
  }
}
