import { authenticate, type JwtPayload } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../db/DbClient";
import type { SaasTenant } from "./SaasOnboardingService";
import { getSaasOnboardingService } from "./SaasOnboardingService";
import { SAAS_TENANT_SELECT, saasTenantFromRow, type SaasTenantRow } from "./saasTenantMapper";
import {
  assertSaasPermission,
  mapWorkspaceRoleToSaas,
  SaasRbacError,
  type SaasAction,
  type SaasRole,
} from "./saasRbac";
import { SaasPlanQuotaError } from "./saasPlanLimits";
import {
  extractClientIp,
  getSaasSecurityEnterpriseService,
  SaasSecurityEnterpriseError,
} from "./SaasSecurityEnterpriseService";

export type SaasRequestContext = {
  claims: JwtPayload;
  tenant: SaasTenant;
  role: SaasRole;
};

type MemberTenantRow = SaasTenantRow & { member_role: string };

const ST_TENANT_SELECT = SAAS_TENANT_SELECT.split(",")
  .map((c) => `st.${c.trim()}`)
  .join(", ");

async function resolveTenantAccess(userId: string): Promise<{ tenant: SaasTenant; role: SaasRole }> {
  const owned = await getSaasOnboardingService().getTenant(userId);
  if (owned) {
    return { tenant: owned, role: "owner" };
  }

  const db = DbClient.getInstance();

  try {
    const ssoRows = await db.query<MemberTenantRow>(
      `SELECT 'member' AS member_role, ${ST_TENANT_SELECT}
       FROM saas_sso_identities si
       JOIN saas_tenants st ON st.id = si.tenant_id
       WHERE si.user_id = $1::text
         AND st.onboarding_completed = true
       ORDER BY st.created_at ASC
       LIMIT 1`,
      [userId],
    );
    const ssoRow = ssoRows[0];
    if (ssoRow) {
      const { member_role, ...tenantRow } = ssoRow;
      return {
        tenant: saasTenantFromRow(tenantRow),
        role: mapWorkspaceRoleToSaas(member_role),
      };
    }
  } catch {
    /* saas_sso_identities may be absent before migration 444 */
  }

  const rows = await db.query<MemberTenantRow>(
    `SELECT wm.role AS member_role, ${ST_TENANT_SELECT}
     FROM workspace_members wm
     JOIN saas_tenants st ON st.workspace_id = wm.workspace_id
     WHERE wm.user_id = $1::text
       AND wm.status = 'active'
       AND st.onboarding_completed = true
     ORDER BY st.created_at ASC
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) {
    throw new SaasRbacError("Tenant not found", "NOT_FOUND");
  }
  const { member_role, ...tenantRow } = row;
  return {
    tenant: saasTenantFromRow(tenantRow),
    role: mapWorkspaceRoleToSaas(member_role),
  };
}

/** Authenticate, resolve tenant + role, enforce action permission. */
export async function requireSaasContext(req: Request, action: SaasAction): Promise<SaasRequestContext> {
  let claims: JwtPayload;
  try {
    claims = await authenticate(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      throw new SaasRbacError("Unauthorized", "FORBIDDEN");
    }
    throw e;
  }

  const { tenant, role } = await resolveTenantAccess(claims.userId);

  let customPerms: SaasAction[] | null = null;
  try {
    customPerms = await getSaasSecurityEnterpriseService().getCustomPermissions(tenant.id, claims.userId);
  } catch {
    /* migration 482 optional in test DB */
  }
  if (customPerms && !customPerms.includes(action)) {
    throw new SaasRbacError("Forbidden", "FORBIDDEN");
  } else if (!customPerms) {
    assertSaasPermission(role, action);
  }

  try {
    const ipCfg = await getSaasSecurityEnterpriseService().getIpAllowlist(tenant.id);
    getSaasSecurityEnterpriseService().assertIpAllowed(ipCfg, extractClientIp(req));
  } catch (e) {
    if (e instanceof SaasSecurityEnterpriseError) {
      throw new SaasRbacError(e.message, "FORBIDDEN");
    }
    /* missing saas_tenant_ip_allowlist table — skip until migrate 482 */
  }

  return { claims, tenant, role };
}

export function saasErrorStatus(e: unknown): number {
  if (e instanceof SaasRbacError) {
    if (e.message === "Unauthorized") return 401;
    return e.code === "NOT_FOUND" ? 404 : 403;
  }
  if (e instanceof SaasPlanQuotaError) return 403;
  if (e instanceof OsAgentError && e.message === "Unauthorized") return 401;
  return 500;
}

export function saasErrorBody(e: unknown): { error: string; code?: string } {
  if (e instanceof SaasRbacError) {
    return { error: e.message, code: e.code };
  }
  if (e instanceof SaasPlanQuotaError) {
    return { error: e.message, code: "PLAN_LIMIT" };
  }
  if (e instanceof OsAgentError && e.message === "Unauthorized") {
    return { error: "Unauthorized" };
  }
  if (e instanceof Error) {
    return { error: e.message };
  }
  return { error: "Internal error" };
}
