/**
 * SaasScimService — SCIM 2.0 Users provisioning (team_members).
 * Auth: Bearer SCIM_BEARER_TOKEN or API key with scope `scim`.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { getSaasApiKeysService } from "./SaasApiKeysService";

export class SaasScimError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION" | "CONFLICT",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "SaasScimError";
  }
}

export type ScimUser = {
  id: string;
  userName: string;
  name: { formatted: string };
  emails: Array<{ value: string; primary: boolean }>;
  active: boolean;
  roles: string[];
};

export type ScimGroup = {
  id: string;
  displayName: string;
  members: Array<{ value: string; display: string }>;
};

type MemberRow = {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
};

function rowToScim(r: MemberRow): ScimUser {
  return {
    id: r.id,
    userName: r.email,
    name: { formatted: r.name?.trim() || r.email },
    emails: [{ value: r.email, primary: true }],
    active: r.status === "active",
    roles: [r.role],
  };
}

export async function resolveScimTenantId(authHeader: string | null): Promise<string> {
  const raw = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!raw) throw new SaasScimError("Missing Bearer token", "UNAUTHORIZED", 401);

  const envToken = process.env.SCIM_BEARER_TOKEN?.trim();
  const envTenant = process.env.SCIM_TENANT_ID?.trim();
  if (envToken && raw === envToken && envTenant) return envTenant;

  const verified = await getSaasApiKeysService().verifyKey(raw);
  if (!verified) throw new SaasScimError("Invalid token", "UNAUTHORIZED", 401);
  if (!verified.scopes.includes("scim") && !verified.scopes.includes("admin")) {
    throw new SaasScimError("Token missing scim scope", "UNAUTHORIZED", 403);
  }
  return verified.tenantId;
}

export class SaasScimService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async listUsers(tenantId: string, startIndex = 1, count = 100): Promise<{ total: number; items: ScimUser[] }> {
    const rows = await this.db.query<MemberRow>(
      `SELECT id, tenant_id, email, name, role, status
       FROM team_members WHERE tenant_id = $1 ORDER BY created_at ASC`,
      [tenantId],
    );
    const slice = rows.slice(Math.max(0, startIndex - 1), Math.max(0, startIndex - 1) + count);
    return { total: rows.length, items: slice.map(rowToScim) };
  }

  async getUser(tenantId: string, id: string): Promise<ScimUser> {
    const rows = await this.db.query<MemberRow>(
      `SELECT id, tenant_id, email, name, role, status FROM team_members WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasScimError("User not found", "NOT_FOUND", 404);
    return rowToScim(rows[0]);
  }

  async createUser(
    tenantId: string,
    input: { userName: string; name?: string; active?: boolean; roles?: string[] },
  ): Promise<ScimUser> {
    const email = input.userName.trim().toLowerCase();
    if (!email.includes("@")) throw new SaasScimError("userName must be email", "VALIDATION");

    const role = input.roles?.[0] ?? "user";
    const status = input.active === false ? "suspended" : "invited";

    const rows = await this.db.query<MemberRow>(
      `INSERT INTO team_members (tenant_id, email, name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, status=EXCLUDED.status, updated_at=NOW()
       RETURNING id, tenant_id, email, name, role, status`,
      [tenantId, email, input.name ?? null, role, status],
    );
    if (!rows[0]) throw new SaasScimError("Failed to create user", "VALIDATION");
    return rowToScim(rows[0]);
  }

  async patchUser(tenantId: string, id: string, patch: { active?: boolean; name?: string; roles?: string[] }): Promise<ScimUser> {
    const existing = await this.getUser(tenantId, id);
    const status = patch.active === undefined ? (existing.active ? "active" : "suspended") : patch.active ? "active" : "suspended";
    const role = patch.roles?.[0] ?? existing.roles[0] ?? "user";
    const name = patch.name ?? existing.name.formatted;

    const rows = await this.db.query<MemberRow>(
      `UPDATE team_members SET status=$3, role=$4, name=$5, updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, email, name, role, status`,
      [tenantId, id, status, role, name],
    );
    if (!rows[0]) throw new SaasScimError("User not found", "NOT_FOUND", 404);
    return rowToScim(rows[0]);
  }

  async deleteUser(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE team_members SET status='suspended', updated_at=NOW() WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasScimError("User not found", "NOT_FOUND", 404);
  }

  async listGroups(tenantId: string): Promise<{ total: number; items: ScimGroup[] }> {
    const rows = await this.db.query<{ id: string; email: string; role: string }>(
      `SELECT id, email, role FROM team_members WHERE tenant_id=$1 AND status IN ('active','invited')`,
      [tenantId],
    );
    const roles = ["admin", "manager", "user"] as const;
    const items: ScimGroup[] = roles.map((role) => ({
      id: role,
      displayName: role.charAt(0).toUpperCase() + role.slice(1),
      members: rows
        .filter((r) => r.role === role)
        .map((r) => ({ value: r.id, display: r.email })),
    }));
    return { total: items.length, items };
  }

  async getGroup(tenantId: string, id: string): Promise<ScimGroup> {
    const { items } = await this.listGroups(tenantId);
    const group = items.find((g) => g.id === id);
    if (!group) throw new SaasScimError("Group not found", "NOT_FOUND", 404);
    return group;
  }
}

let _svc: SaasScimService | undefined;
export function getSaasScimService(): SaasScimService {
  _svc ??= new SaasScimService();
  return _svc;
}
export function resetSaasScimServiceForTests(): void {
  _svc = undefined;
}
