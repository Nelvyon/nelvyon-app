import crypto from "crypto";
import { Secret, TOTP } from "otpauth";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { encryptSecret, decryptSecret } from "./SaasSsoService";
import type { SaasAction } from "./saasRbac";

export class SaasSecurityEnterpriseError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION" | "NOT_FOUND" | "FORBIDDEN" | "MFA_REQUIRED",
  ) {
    super(message);
    this.name = "SaasSecurityEnterpriseError";
  }
}

export type IpAllowlistConfig = { enabled: boolean; cidrs: string[] };
export type CustomRole = { id: string; name: string; permissions: SaasAction[] };
export type Territory = { id: string; name: string; regions: string[]; ownerUserId: string | null };
export type SandboxLink = { id: string; name: string; sandboxTenantId: string; createdAt: string };
export type MfaStatus = { enabled: boolean; enforced: boolean; provisioningUri?: string };

function ipToLong(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p) || p < 0 || p > 255)) return null;
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
}

function matchCidr(ip: string, cidr: string): boolean {
  const [net, bitsStr] = cidr.split("/");
  const bits = bitsStr ? Number(bitsStr) : 32;
  const ipLong = ipToLong(ip);
  const netLong = ipToLong(net ?? "");
  if (ipLong === null || netLong === null || !Number.isFinite(bits)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipLong & mask) === (netLong & mask);
}

export class SaasSecurityEnterpriseService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async getIpAllowlist(tenantId: string): Promise<IpAllowlistConfig> {
    const rows = await this.db.query<{ enabled: boolean; cidrs: string[] }>(
      `SELECT enabled, cidrs FROM saas_tenant_ip_allowlist WHERE tenant_id=$1`,
      [tenantId],
    );
    if (!rows[0]) return { enabled: false, cidrs: [] };
    return { enabled: rows[0].enabled, cidrs: rows[0].cidrs ?? [] };
  }

  async upsertIpAllowlist(tenantId: string, cfg: IpAllowlistConfig): Promise<IpAllowlistConfig> {
    const cidrs = (cfg.cidrs ?? []).map((c) => c.trim()).filter(Boolean);
    await this.db.query(
      `INSERT INTO saas_tenant_ip_allowlist (tenant_id, enabled, cidrs, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET enabled=EXCLUDED.enabled, cidrs=EXCLUDED.cidrs, updated_at=NOW()`,
      [tenantId, cfg.enabled, cidrs],
    );
    return { enabled: cfg.enabled, cidrs };
  }

  assertIpAllowed(cfg: IpAllowlistConfig, clientIp: string | null): void {
    if (!cfg.enabled) return;
    if (!clientIp) throw new SaasSecurityEnterpriseError("IP address required", "FORBIDDEN");
    const ok = cfg.cidrs.some((c) => matchCidr(clientIp, c) || clientIp === c);
    if (!ok) throw new SaasSecurityEnterpriseError(`IP ${clientIp} not in allowlist`, "FORBIDDEN");
  }

  async listCustomRoles(tenantId: string): Promise<CustomRole[]> {
    const rows = await this.db.query<{ id: string; name: string; permissions: string[] }>(
      `SELECT id, name, permissions FROM saas_custom_roles WHERE tenant_id=$1 ORDER BY name`,
      [tenantId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      permissions: r.permissions as SaasAction[],
    }));
  }

  async upsertCustomRole(tenantId: string, input: { id?: string; name: string; permissions: SaasAction[] }): Promise<CustomRole> {
    if (!input.name.trim()) throw new SaasSecurityEnterpriseError("name required", "VALIDATION");
    if (input.id) {
      const rows = await this.db.query<{ id: string; name: string; permissions: string[] }>(
        `UPDATE saas_custom_roles SET name=$3, permissions=$4 WHERE id=$1 AND tenant_id=$2
         RETURNING id, name, permissions`,
        [input.id, tenantId, input.name.trim(), input.permissions],
      );
      if (!rows[0]) throw new SaasSecurityEnterpriseError("Role not found", "NOT_FOUND");
      return { id: rows[0].id, name: rows[0].name, permissions: rows[0].permissions as SaasAction[] };
    }
    const rows = await this.db.query<{ id: string; name: string; permissions: string[] }>(
      `INSERT INTO saas_custom_roles (tenant_id, name, permissions) VALUES ($1,$2,$3)
       RETURNING id, name, permissions`,
      [tenantId, input.name.trim(), input.permissions],
    );
    return { id: rows[0]!.id, name: rows[0]!.name, permissions: rows[0]!.permissions as SaasAction[] };
  }

  async assignCustomRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO saas_member_custom_roles (user_id, tenant_id, role_id) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET role_id=EXCLUDED.role_id`,
      [userId, tenantId, roleId],
    );
  }

  async getCustomPermissions(tenantId: string, userId: string): Promise<SaasAction[] | null> {
    const rows = await this.db.query<{ permissions: string[] }>(
      `SELECT cr.permissions FROM saas_member_custom_roles mr
       JOIN saas_custom_roles cr ON cr.id = mr.role_id
       WHERE mr.tenant_id=$1 AND mr.user_id=$2 LIMIT 1`,
      [tenantId, userId],
    );
    if (!rows[0]) return null;
    return rows[0].permissions as SaasAction[];
  }

  async listTerritories(tenantId: string): Promise<Territory[]> {
    const rows = await this.db.query<{ id: string; name: string; regions: string[]; owner_user_id: string | null }>(
      `SELECT id, name, regions, owner_user_id FROM saas_crm_territories WHERE tenant_id=$1 ORDER BY name`,
      [tenantId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      regions: r.regions ?? [],
      ownerUserId: r.owner_user_id,
    }));
  }

  async upsertTerritory(tenantId: string, input: { id?: string; name: string; regions: string[]; ownerUserId?: string }): Promise<Territory> {
    if (input.id) {
      const rows = await this.db.query<{ id: string; name: string; regions: string[]; owner_user_id: string | null }>(
        `UPDATE saas_crm_territories SET name=$3, regions=$4, owner_user_id=$5
         WHERE id=$1 AND tenant_id=$2 RETURNING id, name, regions, owner_user_id`,
        [input.id, tenantId, input.name, input.regions, input.ownerUserId ?? null],
      );
      if (!rows[0]) throw new SaasSecurityEnterpriseError("Territory not found", "NOT_FOUND");
      return { id: rows[0].id, name: rows[0].name, regions: rows[0].regions ?? [], ownerUserId: rows[0].owner_user_id };
    }
    const rows = await this.db.query<{ id: string; name: string; regions: string[]; owner_user_id: string | null }>(
      `INSERT INTO saas_crm_territories (tenant_id, name, regions, owner_user_id)
       VALUES ($1,$2,$3,$4) RETURNING id, name, regions, owner_user_id`,
      [tenantId, input.name, input.regions, input.ownerUserId ?? null],
    );
    const r = rows[0]!;
    return { id: r.id, name: r.name, regions: r.regions ?? [], ownerUserId: r.owner_user_id };
  }

  async listSandboxes(parentTenantId: string): Promise<SandboxLink[]> {
    const rows = await this.db.query<{ id: string; name: string; sandbox_tenant_id: string; created_at: string }>(
      `SELECT id, name, sandbox_tenant_id, created_at FROM saas_sandbox_tenants WHERE parent_tenant_id=$1`,
      [parentTenantId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      sandboxTenantId: r.sandbox_tenant_id,
      createdAt: String(r.created_at),
    }));
  }

  async createSandbox(parentTenantId: string, name: string, ownerUserId: string): Promise<SandboxLink> {
    const wsRows = await this.db.query<{ workspace_id: number; plan: string; company_name: string }>(
      `SELECT workspace_id, plan, company_name FROM saas_tenants WHERE id=$1`,
      [parentTenantId],
    );
    const parent = wsRows[0];
    if (!parent) throw new SaasSecurityEnterpriseError("Parent tenant not found", "NOT_FOUND");

    const sandboxRows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_tenants (owner_user_id, company_name, plan, workspace_id, onboarding_completed, data_region)
       VALUES ($1, $2, $3, $4, true, (SELECT data_region FROM saas_tenants WHERE id=$5))
       RETURNING id`,
      [ownerUserId, `${parent.company_name} Sandbox: ${name}`, parent.plan, parent.workspace_id, parentTenantId],
    );
    const sandboxTenantId = sandboxRows[0]!.id;

    const linkRows = await this.db.query<{ id: string; created_at: string }>(
      `INSERT INTO saas_sandbox_tenants (parent_tenant_id, sandbox_tenant_id, name)
       VALUES ($1,$2,$3) RETURNING id, created_at`,
      [parentTenantId, sandboxTenantId, name],
    );
    return {
      id: linkRows[0]!.id,
      name,
      sandboxTenantId,
      createdAt: String(linkRows[0]!.created_at),
    };
  }

  async getMfaStatus(tenantId: string, userId: string): Promise<MfaStatus> {
    const enforcedRows = await this.db.query<{ mfa_enforced: boolean }>(
      `SELECT mfa_enforced FROM saas_tenants WHERE id=$1`,
      [tenantId],
    );
    const mfaRows = await this.db.query<{ enabled: boolean }>(
      `SELECT enabled FROM saas_user_mfa WHERE user_id=$1 AND tenant_id=$2`,
      [userId, tenantId],
    );
    return {
      enabled: mfaRows[0]?.enabled ?? false,
      enforced: enforcedRows[0]?.mfa_enforced ?? false,
    };
  }

  async beginMfaEnrollment(tenantId: string, userId: string, email: string): Promise<{ provisioningUri: string }> {
    const secret = new Secret({ size: 20 });
    const enc = encryptSecret(secret.base32);
    await this.db.query(
      `INSERT INTO saas_user_mfa (user_id, tenant_id, totp_secret_enc, enabled, updated_at)
       VALUES ($1,$2,$3,false,NOW())
       ON CONFLICT (user_id) DO UPDATE SET totp_secret_enc=EXCLUDED.totp_secret_enc, tenant_id=EXCLUDED.tenant_id, updated_at=NOW()`,
      [userId, tenantId, enc],
    );
    const totp = new TOTP({ issuer: "Nelvyon", label: email, secret, algorithm: "SHA1", digits: 6, period: 30 });
    return { provisioningUri: totp.toString() };
  }

  async verifyAndEnableMfa(userId: string, code: string): Promise<boolean> {
    const rows = await this.db.query<{ totp_secret_enc: string }>(
      `SELECT totp_secret_enc FROM saas_user_mfa WHERE user_id=$1`,
      [userId],
    );
    if (!rows[0]) throw new SaasSecurityEnterpriseError("MFA not started", "NOT_FOUND");
    const secret = Secret.fromBase32(decryptSecret(rows[0].totp_secret_enc));
    const totp = new TOTP({ secret, algorithm: "SHA1", digits: 6, period: 30 });
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) return false;
    await this.db.query(`UPDATE saas_user_mfa SET enabled=true, updated_at=NOW() WHERE user_id=$1`, [userId]);
    return true;
  }

  async setTenantMfaEnforced(tenantId: string, enforced: boolean): Promise<void> {
    await this.db.query(`UPDATE saas_tenants SET mfa_enforced=$2 WHERE id=$1`, [tenantId, enforced]);
  }

  async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    const rows = await this.db.query<{ totp_secret_enc: string; enabled: boolean }>(
      `SELECT totp_secret_enc, enabled FROM saas_user_mfa WHERE user_id=$1`,
      [userId],
    );
    if (!rows[0]?.enabled) return true;
    const secret = Secret.fromBase32(decryptSecret(rows[0].totp_secret_enc));
    const totp = new TOTP({ secret, algorithm: "SHA1", digits: 6, period: 30 });
    return totp.validate({ token: code, window: 1 }) !== null;
  }
}

let _svc: SaasSecurityEnterpriseService | undefined;
export function getSaasSecurityEnterpriseService(): SaasSecurityEnterpriseService {
  if (!_svc) _svc = new SaasSecurityEnterpriseService();
  return _svc;
}
export function resetSaasSecurityEnterpriseServiceForTests(): void { _svc = undefined; }

export function extractClientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}
