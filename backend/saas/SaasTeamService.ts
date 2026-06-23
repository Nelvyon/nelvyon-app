import crypto from "crypto";
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type TeamMemberRole = "owner" | "admin" | "manager" | "user" | "viewer";
export type TeamMemberStatus = "active" | "invited" | "suspended";

export interface SaasTeamMember {
  id: string;
  tenantId: string;
  userId: string | null;
  email: string;
  name: string | null;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InviteTeamMemberInput {
  email: string;
  name?: string | null;
  role?: TeamMemberRole;
}

export class SaasTeamError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "CONSTRAINT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasTeamError";
  }
}

const ROLES: TeamMemberRole[] = ["owner", "admin", "manager", "user", "viewer"];

type MemberRow = {
  id: string; tenant_id: string; user_id: string | null; email: string;
  name: string | null; role: TeamMemberRole; status: TeamMemberStatus;
  last_active_at: Date | string | null; created_at: Date | string; updated_at: Date | string;
};

function rowToMember(r: MemberRow): SaasTeamMember {
  return {
    id: r.id, tenantId: r.tenant_id, userId: r.user_id, email: r.email, name: r.name,
    role: r.role, status: r.status,
    lastActiveAt: r.last_active_at ? new Date(r.last_active_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export class SaasTeamService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string): Promise<SaasTeamMember[]> {
    const rows = await this.db.query<MemberRow>(
      `SELECT id, tenant_id, user_id, email, name, role, status, last_active_at, created_at, updated_at
       FROM team_members WHERE tenant_id=$1 ORDER BY created_at ASC`,
      [tenantId],
    );
    return rows.map(rowToMember);
  }

  async get(tenantId: string, id: string): Promise<SaasTeamMember | null> {
    const rows = await this.db.query<MemberRow>(
      `SELECT id, tenant_id, user_id, email, name, role, status, last_active_at, created_at, updated_at
       FROM team_members WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToMember(rows[0]) : null;
  }

  async invite(tenantId: string, input: InviteTeamMemberInput): Promise<SaasTeamMember> {
    const email = input.email.toLowerCase().trim();
    if (!email || !email.includes("@")) throw new SaasTeamError("Valid email required", "VALIDATION");
    const role = input.role ?? "user";
    if (!ROLES.includes(role)) throw new SaasTeamError(`Invalid role: ${role}`, "VALIDATION");
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    try {
      const rows = await this.db.query<MemberRow>(
        `INSERT INTO team_members (tenant_id, email, name, role, status, invite_token, invite_expires_at, updated_at)
         VALUES ($1,$2,$3,$4,'invited',$5,$6,NOW())
         ON CONFLICT (tenant_id, email) DO UPDATE
           SET invite_token=$5, invite_expires_at=$6, status='invited', role=$4, updated_at=NOW()
         RETURNING id, tenant_id, user_id, email, name, role, status, last_active_at, created_at, updated_at`,
        [tenantId, email, input.name ?? null, role, inviteToken, inviteExpires],
      );
      if (!rows[0]) throw new SaasTeamError("Failed to invite member", "CONSTRAINT");
      return rowToMember(rows[0]);
    } catch (e: unknown) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505") {
        throw new SaasTeamError("Member already exists", "CONSTRAINT");
      }
      throw e;
    }
  }

  async updateRole(tenantId: string, id: string, role: TeamMemberRole): Promise<SaasTeamMember> {
    if (!ROLES.includes(role)) throw new SaasTeamError(`Invalid role: ${role}`, "VALIDATION");
    const rows = await this.db.query<MemberRow>(
      `UPDATE team_members SET role=$3, updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, user_id, email, name, role, status, last_active_at, created_at, updated_at`,
      [tenantId, id, role],
    );
    if (!rows[0]) throw new SaasTeamError("Member not found", "NOT_FOUND");
    return rowToMember(rows[0]);
  }

  async suspend(tenantId: string, id: string): Promise<SaasTeamMember> {
    const rows = await this.db.query<MemberRow>(
      `UPDATE team_members SET status='suspended', updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, user_id, email, name, role, status, last_active_at, created_at, updated_at`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasTeamError("Member not found", "NOT_FOUND");
    return rowToMember(rows[0]);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM team_members WHERE tenant_id=$1 AND id=$2 AND role != 'owner' RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasTeamError("Member not found or cannot remove owner", "FORBIDDEN");
  }
}

let _instance: SaasTeamService | null = null;
export function getSaasTeamService(): SaasTeamService {
  if (!_instance) _instance = new SaasTeamService();
  return _instance;
}
export function resetSaasTeamServiceForTests(): void { _instance = null; }
