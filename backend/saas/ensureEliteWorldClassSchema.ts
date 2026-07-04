import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

let schemaReady = false;

/** Schema owned by migration 482_elite_world_class_frentes.sql — no runtime DDL in production paths. */
export async function ensureEliteWorldClassSchema(db: Pick<DbClient, "query"> = DbClientClass.getInstance()): Promise<void> {
  if (schemaReady) return;
  const rows = await db.query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'saas_marketplace_apps'
     ) AS ok`,
  ).catch(() => [{ ok: false }]);
  if (rows[0]?.ok) schemaReady = true;
}

export function resetEliteWorldClassSchemaForTests(): void {
  schemaReady = false;
}
