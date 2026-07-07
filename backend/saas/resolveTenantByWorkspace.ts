import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

/** Resolve saas_tenants.id from nelvyon workspace_id (bridge index: 310_saas_tenant_workspace_bridge). */
export async function resolveTenantIdByWorkspace(
  workspaceId: number,
  db: Pick<DbClient, "query"> = DbClientClass.getInstance(),
): Promise<string | null> {
  const rows = await db.query<{ id: string }>(
    `SELECT id FROM saas_tenants WHERE workspace_id = $1 LIMIT 1`,
    [workspaceId],
  );
  return rows[0]?.id ?? null;
}
