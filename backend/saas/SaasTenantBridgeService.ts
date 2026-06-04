import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort, SaasTenant } from "./SaasOnboardingService";
import { saasTenantFromRow, type SaasTenantRow } from "./saasTenantMapper";

export class SaasTenantBridgeError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "CONFLICT" | "VALIDATION",
  ) {
    super(message);
    this.name = "SaasTenantBridgeError";
  }
}

/**
 * Puente oficial entre el tenant SaaS (UUID) y el workspace legacy (INTEGER).
 * Ver docs/PHASE_1A_TENANT_BRIDGE.md
 */
export class SaasTenantBridgeService {
  constructor(private readonly db: SaasPostgresPort) {}

  async getTenantByWorkspaceId(workspaceId: number): Promise<SaasTenant | null> {
    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      throw new SaasTenantBridgeError("workspaceId must be a positive integer", "VALIDATION");
    }
    const rows = await this.db.query<SaasTenantRow>(
      `SELECT id, user_id, workspace_id, company_name, industry, plan, website, phone, employees, goals,
              onboarding_completed, onboarding_step, created_at, updated_at
       FROM saas_tenants
       WHERE workspace_id = $1
       LIMIT 1`,
      [workspaceId],
    );
    const row = rows[0];
    return row ? saasTenantFromRow(row) : null;
  }

  async getWorkspaceIdForTenant(tenantId: string): Promise<number | null> {
    const rows = await this.db.query<{ workspace_id: number | null }>(
      `SELECT workspace_id FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    const wid = rows[0]?.workspace_id;
    return typeof wid === "number" && Number.isInteger(wid) ? wid : null;
  }

  /**
   * Asigna el workspace primario (menor id) del usuario al saas_tenant si aún no tiene bridge.
   */
  async linkPrimaryWorkspace(userId: string, saasTenantId: string): Promise<number | null> {
    const rows = await this.db.query<{ workspace_id: number | null }>(
      `UPDATE saas_tenants st
       SET workspace_id = sub.wid,
           updated_at = NOW()
       FROM (
         SELECT (
           SELECT w.id
           FROM workspaces w
           WHERE w.user_id = $1::text
           ORDER BY w.id ASC
           LIMIT 1
         ) AS wid
       ) sub
       WHERE st.id = $2::uuid
         AND st.user_id = $3::uuid
         AND st.workspace_id IS NULL
         AND sub.wid IS NOT NULL
       RETURNING st.workspace_id`,
      [userId, saasTenantId, userId],
    );
    const linked = rows[0]?.workspace_id;
    return typeof linked === "number" ? linked : null;
  }

  /**
   * Vincula un workspace concreto (debe pertenecer al usuario) al tenant SaaS.
   */
  async linkWorkspace(userId: string, saasTenantId: string, workspaceId: number): Promise<SaasTenant> {
    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      throw new SaasTenantBridgeError("workspaceId must be a positive integer", "VALIDATION");
    }
    const owner = await this.db.query<{ id: number }>(
      `SELECT w.id FROM workspaces w
       WHERE w.id = $1 AND w.user_id = $2::text
       LIMIT 1`,
      [workspaceId, userId],
    );
    if (!owner[0]) {
      throw new SaasTenantBridgeError("Workspace not found or not owned by user", "NOT_FOUND");
    }
    try {
      const rows = await this.db.query<SaasTenantRow>(
        `UPDATE saas_tenants
         SET workspace_id = $2, updated_at = NOW()
         WHERE id = $1::uuid AND user_id = $3::uuid
         RETURNING id, user_id, workspace_id, company_name, industry, plan, website, phone, employees, goals,
                   onboarding_completed, onboarding_step, created_at, updated_at`,
        [saasTenantId, workspaceId, userId],
      );
      const row = rows[0];
      if (!row) {
        throw new SaasTenantBridgeError("Tenant not found", "NOT_FOUND");
      }
      return saasTenantFromRow(row);
    } catch (e: unknown) {
      const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
      if (code === "23505") {
        throw new SaasTenantBridgeError("Workspace already linked to another SaaS tenant", "CONFLICT");
      }
      throw e;
    }
  }
}

let cachedBridge: SaasTenantBridgeService | undefined;

export function getSaasTenantBridgeService(): SaasTenantBridgeService {
  if (!cachedBridge) {
    cachedBridge = new SaasTenantBridgeService(DbClient.getInstance());
  }
  return cachedBridge;
}

export function resetSaasTenantBridgeServiceForTests(): void {
  cachedBridge = undefined;
}
