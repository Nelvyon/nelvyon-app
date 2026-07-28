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
import { createLogger } from "../logger/logger";

const saasCtxLog = createLogger("saas-request-context");

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
      `SELECT COALESCE(wm.role, 'member') AS member_role, ${ST_TENANT_SELECT}
       FROM saas_sso_identities si
       JOIN saas_tenants st ON st.id = si.tenant_id
       LEFT JOIN workspace_members wm
         ON wm.workspace_id = st.workspace_id
        AND wm.user_id = si.user_id
        AND wm.status = 'active'
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
  } catch (e) {
    if (isPgMissingRelation(e)) {
      /* saas_sso_identities may be absent before migration 444 */
    } else {
      saasCtxLog.warn("SSO tenant lookup failed — not falling back (fail-fast)", {
        userId,
        operation: "resolveTenantAccess.sso",
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
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
  } catch (e) {
    if (isPgMissingRelation(e)) {
      /* migration 482 optional — default role RBAC */
    } else {
      saasCtxLog.warn("custom permissions lookup failed — fail-closed", {
        tenantId: tenant.id,
        operation: "getCustomPermissions",
        error: e instanceof Error ? e.message : String(e),
      });
      throw new SaasControlPlaneError("Security controls temporarily unavailable");
    }
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
    if (isPgMissingRelation(e)) {
      /* missing saas_tenant_ip_allowlist — skip until migrate 482 */
    } else {
      saasCtxLog.warn("IP allowlist lookup failed — fail-closed", {
        tenantId: tenant.id,
        operation: "getIpAllowlist",
        error: e instanceof Error ? e.message : String(e),
      });
      throw new SaasControlPlaneError("Security controls temporarily unavailable");
    }
  }

  return { claims, tenant, role };
}

/** Transient failure reading enterprise security controls (allowlist / custom ACLs). */
export class SaasControlPlaneError extends Error {
  readonly code = "SECURITY_UNAVAILABLE" as const;
  constructor(message = "Security controls temporarily unavailable") {
    super(message);
    this.name = "SaasControlPlaneError";
  }
}

export function saasErrorStatus(e: unknown): number {
  if (e instanceof SaasRbacError) {
    if (e.message === "Unauthorized") return 401;
    return e.code === "NOT_FOUND" ? 404 : 403;
  }
  if (e instanceof SaasPlanQuotaError) return 403;
  if (e instanceof SaasControlPlaneError) return 503;
  if (e instanceof OsAgentError && e.message === "Unauthorized") return 401;
  if (e instanceof Error && /PRIVATE_AI_CANARY_BLOCKED/i.test(e.message)) return 403;
  if (isPgMissingRelation(e)) return 503;
  return 500;
}

export type SaasErrorBody = { error: string; code?: string; requestId?: string };

export function saasErrorBody(
  e: unknown,
  opts?: { requestId?: string | null },
): SaasErrorBody {
  const requestId = opts?.requestId?.trim() || undefined;
  const withId = (body: SaasErrorBody): SaasErrorBody =>
    requestId ? { ...body, requestId } : body;

  if (e instanceof SaasRbacError) {
    return withId({ error: e.message, code: e.code });
  }
  if (e instanceof SaasPlanQuotaError) {
    return withId({ error: e.message, code: "PLAN_LIMIT" });
  }
  if (e instanceof SaasControlPlaneError) {
    return withId({ error: e.message, code: e.code });
  }
  if (e instanceof OsAgentError && e.message === "Unauthorized") {
    return withId({ error: "Unauthorized" });
  }
  // Canary/kill gates are intentional fail-closed — never hide as opaque 500.
  if (e instanceof Error && /PRIVATE_AI_CANARY_BLOCKED/i.test(e.message)) {
    console.error("[saasErrorBody]", e.message);
    return withId({ error: e.message, code: "PRIVATE_AI_CANARY_BLOCKED" });
  }
  // Schema drift (missing table/column) — fail-closed without leaking relation names.
  if (isPgMissingRelation(e)) {
    console.error("[saasErrorBody]", e instanceof Error ? e.message : String(e));
    return withId({
      error: "Database schema incomplete — apply pending migrations",
      code: "SCHEMA_MISMATCH",
    });
  }
  // Do not leak driver/SQL internals to API clients.
  if (e instanceof Error) {
    console.error("[saasErrorBody]", e.message);
  }
  return withId({ error: "Internal error" });
}

/** Prefer middleware `x-request-id` for client↔log correlation. */
export function requestIdFrom(req: Request): string | undefined {
  const h = req.headers.get("x-request-id")?.trim();
  return h || undefined;
}

/** Postgres 42P01 — table/column not migrated yet. */
export function isPgMissingRelation(e: unknown): boolean {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
  if (code === "42P01" || code === "42703") return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /relation .* does not exist|42P01|column .* does not exist|42703/i.test(msg);
}
