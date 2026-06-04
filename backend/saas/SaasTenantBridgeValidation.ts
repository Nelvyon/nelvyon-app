import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type TenantBridgeValidationReport = {
  executedAt: string;
  migrationsChecked: { bridge310: boolean; rls311: boolean };
  summary: {
    totalTenants: number;
    withWorkspace: number;
    withoutWorkspace: number;
    duplicateWorkspaceIds: number;
  };
  tenantsWithoutWorkspace: Array<{ id: string; userId: string; companyName: string }>;
  duplicateWorkspaces: Array<{ workspaceId: number; count: number; tenantIds: string[] }>;
  tenantsPerWorkspace: Array<{ workspaceId: number; tenantCount: number }>;
  workspacesWithoutSaasTenant: Array<{ workspaceId: number; userId: string }>;
  ok: boolean;
};

type CountRow = { n: string | number };
type TenantRow = { id: string; user_id: string; company_name: string };
type DupRow = { workspace_id: number; n: string | number; tenant_ids: string[] };
type WsRow = { workspace_id: number; tenant_count: string | number };
type OrphanWs = { workspace_id: number; user_id: string };

export class SaasTenantBridgeValidationService {
  constructor(private readonly db: SaasPostgresPort) {}

  async run(): Promise<TenantBridgeValidationReport> {
    const [mig310, mig311] = await Promise.all([
      this.db.query<{ name: string }>(
        `SELECT name FROM _migrations WHERE name = $1 LIMIT 1`,
        ["310_saas_tenant_workspace_bridge.sql"],
      ),
      this.db.query<{ name: string }>(
        `SELECT name FROM _migrations WHERE name = $1 LIMIT 1`,
        ["311_saas_tenant_rls.sql"],
      ),
    ]);

    const summaryRows = await this.db.query<{
      total_tenants: string | number;
      with_workspace: string | number;
      without_workspace: string | number;
    }>(
      `SELECT COUNT(*)::text AS total_tenants,
              COUNT(workspace_id)::text AS with_workspace,
              (COUNT(*) - COUNT(workspace_id))::text AS without_workspace
       FROM saas_tenants`,
    );
    const summary = summaryRows[0] ?? { total_tenants: 0, with_workspace: 0, without_workspace: 0 };

    const withoutWs = await this.db.query<TenantRow>(
      `SELECT id, user_id, company_name
       FROM saas_tenants
       WHERE workspace_id IS NULL
       ORDER BY created_at
       LIMIT 500`,
    );

    const dups = await this.db.query<DupRow>(
      `SELECT workspace_id, COUNT(*)::text AS n, array_agg(id::text) AS tenant_ids
       FROM saas_tenants
       WHERE workspace_id IS NOT NULL
       GROUP BY workspace_id
       HAVING COUNT(*) > 1`,
    );

    const perWs = await this.db.query<WsRow>(
      `SELECT workspace_id, COUNT(*)::text AS tenant_count
       FROM saas_tenants
       WHERE workspace_id IS NOT NULL
       GROUP BY workspace_id
       ORDER BY workspace_id
       LIMIT 1000`,
    );

    let orphanWorkspaces: OrphanWs[] = [];
    const wsTable = await this.db.query<{ reg: string | null }>(
      `SELECT to_regclass('public.workspaces')::text AS reg`,
    );
    if (wsTable[0]?.reg) {
      orphanWorkspaces = await this.db.query<OrphanWs>(
        `SELECT w.id AS workspace_id, w.user_id::text AS user_id
         FROM workspaces w
         LEFT JOIN saas_tenants st ON st.workspace_id = w.id
         WHERE st.id IS NULL
         ORDER BY w.id
         LIMIT 200`,
      );
    }

    const duplicateWorkspaceIds = dups.length;
    const withoutWorkspace = Number(summary.without_workspace);

    return {
      executedAt: new Date().toISOString(),
      migrationsChecked: {
        bridge310: mig310.length > 0,
        rls311: mig311.length > 0,
      },
      summary: {
        totalTenants: Number(summary.total_tenants),
        withWorkspace: Number(summary.with_workspace),
        withoutWorkspace,
        duplicateWorkspaceIds,
      },
      tenantsWithoutWorkspace: withoutWs.map((r) => ({
        id: r.id,
        userId: r.user_id,
        companyName: r.company_name,
      })),
      duplicateWorkspaces: dups.map((r) => ({
        workspaceId: r.workspace_id,
        count: Number(r.n),
        tenantIds: r.tenant_ids ?? [],
      })),
      tenantsPerWorkspace: perWs.map((r) => ({
        workspaceId: r.workspace_id,
        tenantCount: Number(r.tenant_count),
      })),
      workspacesWithoutSaasTenant: orphanWorkspaces.map((r) => ({
        workspaceId: r.workspace_id,
        userId: r.user_id,
      })),
      ok: duplicateWorkspaceIds === 0 && mig310.length > 0,
    };
  }
}

let cachedValidation: SaasTenantBridgeValidationService | undefined;

export function getSaasTenantBridgeValidationService(): SaasTenantBridgeValidationService {
  if (!cachedValidation) {
    cachedValidation = new SaasTenantBridgeValidationService(DbClient.getInstance());
  }
  return cachedValidation;
}

export function resetSaasTenantBridgeValidationServiceForTests(): void {
  cachedValidation = undefined;
}
