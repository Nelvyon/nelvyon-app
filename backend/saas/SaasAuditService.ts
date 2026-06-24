import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  module: string;
  resourceId: string | null;
  resourceType: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface LogAuditInput {
  userId?: string;
  userEmail?: string;
  action: string;
  module: string;
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditFilters {
  module?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AuditModuleStats {
  module: string;
  count: number;
}

export type SaasAuditServiceDeps = { db?: Pick<DbClient, "query"> };

const SEL = `id, tenant_id as "tenantId", user_id as "userId",
  user_email as "userEmail", action, module,
  resource_id as "resourceId", resource_type as "resourceType",
  details, ip_address as "ipAddress", user_agent as "userAgent",
  created_at as "createdAt"`;

function mapRow(r: Record<string, unknown>): AuditLog {
  return {
    id: String(r.id), tenantId: String(r.tenantId),
    userId: r.userId != null ? String(r.userId) : null,
    userEmail: r.userEmail != null ? String(r.userEmail) : null,
    action: String(r.action), module: String(r.module),
    resourceId: r.resourceId != null ? String(r.resourceId) : null,
    resourceType: r.resourceType != null ? String(r.resourceType) : null,
    details: (r.details as Record<string, unknown>) ?? {},
    ipAddress: r.ipAddress != null ? String(r.ipAddress) : null,
    userAgent: r.userAgent != null ? String(r.userAgent) : null,
    createdAt: String(r.createdAt),
  };
}

export class SaasAuditService {
  constructor(private readonly deps: SaasAuditServiceDeps = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async log(tenantId: string, input: LogAuditInput): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs
         (tenant_id, user_id, user_email, action, module, resource_id, resource_type,
          details, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
      [
        tenantId, input.userId ?? null, input.userEmail ?? null,
        input.action, input.module, input.resourceId ?? null, input.resourceType ?? null,
        JSON.stringify(input.details ?? {}), input.ipAddress ?? null, input.userAgent ?? null,
      ],
    );
  }

  async list(tenantId: string, filters: AuditFilters = {}): Promise<AuditLog[]> {
    const conditions: string[] = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.module) { conditions.push(`module = $${idx++}`); params.push(filters.module); }
    if (filters.userId) { conditions.push(`user_id = $${idx++}::uuid`); params.push(filters.userId); }
    if (filters.action) { conditions.push(`action = $${idx++}`); params.push(filters.action); }
    if (filters.from) { conditions.push(`created_at >= $${idx++}::timestamptz`); params.push(filters.from); }
    if (filters.to) { conditions.push(`created_at <= $${idx++}::timestamptz`); params.push(filters.to); }

    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = filters.offset ?? 0;

    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${SEL} FROM audit_logs WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    return rows.map(mapRow);
  }

  async getModuleStats(tenantId: string): Promise<AuditModuleStats[]> {
    const rows = await this.db.query<{ module: string; count: string }>(
      `SELECT module, COUNT(*)::text as count FROM audit_logs
       WHERE tenant_id=$1 GROUP BY module ORDER BY count DESC`,
      [tenantId],
    );
    return rows.map((r) => ({ module: r.module, count: parseInt(r.count, 10) }));
  }
}

let _svc: SaasAuditService | undefined;
export function getSaasAuditService(): SaasAuditService {
  if (!_svc) _svc = new SaasAuditService();
  return _svc;
}
export function resetSaasAuditServiceForTests(): void { _svc = undefined; }
