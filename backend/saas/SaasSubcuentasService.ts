import { randomUUID } from "crypto";
import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export type SubcuentaStatus = "active" | "suspended" | "cancelled";
export type SubcuentaPlan = "starter" | "pro" | "agency";

export interface Subcuenta {
  id: string;
  agencyTenantId: string;
  tenantId: string;
  name: string;
  email: string;
  plan: SubcuentaPlan;
  status: SubcuentaStatus;
  maxContacts: number;
  maxCampaigns: number;
  stripeConnectPaymentEnabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubcuentaUsage {
  contacts: number;
  campaigns: number;
  workflows: number;
}

export interface CreateSubcuentaInput {
  name: string;
  email: string;
  plan?: SubcuentaPlan;
  maxContacts?: number;
  maxCampaigns?: number;
  notes?: string;
}

export type SaasSubcuentasServiceDeps = {
  db?: Pick<DbClient, "query">;
};

const SELECT = `
  id, agency_tenant_id as "agencyTenantId", tenant_id as "tenantId",
  name, email, plan, status,
  max_contacts as "maxContacts", max_campaigns as "maxCampaigns",
  stripe_connect_payment_enabled as "stripeConnectPaymentEnabled",
  notes, created_at as "createdAt", updated_at as "updatedAt"
`;

function mapRow(r: Record<string, unknown>): Subcuenta {
  return {
    id: String(r.id),
    agencyTenantId: String(r.agencyTenantId),
    tenantId: String(r.tenantId),
    name: String(r.name),
    email: String(r.email),
    plan: String(r.plan) as SubcuentaPlan,
    status: String(r.status) as SubcuentaStatus,
    maxContacts: Number(r.maxContacts ?? 1000),
    maxCampaigns: Number(r.maxCampaigns ?? 5),
    stripeConnectPaymentEnabled: Boolean(r.stripeConnectPaymentEnabled),
    notes: r.notes != null ? String(r.notes) : null,
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  };
}

export class SaasSubcuentasService {
  constructor(private readonly deps: SaasSubcuentasServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async list(agencyTenantId: string, status?: SubcuentaStatus): Promise<Subcuenta[]> {
    const base = `SELECT ${SELECT} FROM saas_subcuentas WHERE agency_tenant_id = $1`;
    const rows = status
      ? await this.db.query<Record<string, unknown>>(base + ` AND status = $2 ORDER BY created_at DESC`, [agencyTenantId, status])
      : await this.db.query<Record<string, unknown>>(base + ` ORDER BY created_at DESC`, [agencyTenantId]);
    return rows.map(mapRow);
  }

  async get(agencyTenantId: string, id: string): Promise<Subcuenta | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${SELECT} FROM saas_subcuentas WHERE id = $1::uuid AND agency_tenant_id = $2`,
      [id, agencyTenantId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(agencyTenantId: string, input: CreateSubcuentaInput): Promise<Subcuenta> {
    if (!input.name?.trim()) throw Object.assign(new Error("name is required"), { code: "VALIDATION" });
    if (!input.email?.includes("@")) throw Object.assign(new Error("valid email is required"), { code: "VALIDATION" });

    const plan = input.plan ?? "starter";
    const defaultLimits: Record<SubcuentaPlan, { contacts: number; campaigns: number }> = {
      starter: { contacts: 1000, campaigns: 5 },
      pro: { contacts: 10000, campaigns: 25 },
      agency: { contacts: 50000, campaigns: 100 },
    };
    const limits = defaultLimits[plan];
    const tenantId = `sub_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_subcuentas
         (agency_tenant_id, tenant_id, name, email, plan, status,
          max_contacts, max_campaigns, notes)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8)
       RETURNING ${SELECT}`,
      [
        agencyTenantId, tenantId, input.name.trim(), input.email.trim(), plan,
        input.maxContacts ?? limits.contacts,
        input.maxCampaigns ?? limits.campaigns,
        input.notes ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasSubcuentasService.create: INSERT returned no row");
    logger.info(`[SUBCUENTAS] Subcuenta creada: ${row.tenantId} para agencia=${agencyTenantId}`);
    return mapRow(row);
  }

  async suspend(agencyTenantId: string, id: string): Promise<Subcuenta | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_subcuentas SET status='suspended', updated_at=NOW()
       WHERE id=$1::uuid AND agency_tenant_id=$2 AND status='active'
       RETURNING ${SELECT}`,
      [id, agencyTenantId],
    );
    if (rows[0]) logger.info(`[SUBCUENTAS] Subcuenta suspendida: ${id}`);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async reactivate(agencyTenantId: string, id: string): Promise<Subcuenta | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_subcuentas SET status='active', updated_at=NOW()
       WHERE id=$1::uuid AND agency_tenant_id=$2 AND status='suspended'
       RETURNING ${SELECT}`,
      [id, agencyTenantId],
    );
    if (rows[0]) logger.info(`[SUBCUENTAS] Subcuenta reactivada: ${id}`);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async cancel(agencyTenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_subcuentas SET status='cancelled', updated_at=NOW()
       WHERE id=$1::uuid AND agency_tenant_id=$2 AND status='suspended'
       RETURNING id`,
      [id, agencyTenantId],
    );
    return rows.length > 0;
  }

  async getUsage(agencyTenantId: string, id: string): Promise<SubcuentaUsage | null> {
    const sub = await this.get(agencyTenantId, id);
    if (!sub) return null;
    const tid = sub.tenantId;

    const [contRow, campRow, wfRow] = await Promise.all([
      this.db.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM contacts WHERE tenant_id=$1`, [tid]),
      this.db.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM saas_campanias WHERE tenant_id=$1`, [tid]),
      this.db.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM saas_workflows WHERE tenant_id=$1 AND status='active'`, [tid]),
    ]);

    return {
      contacts: parseInt(contRow[0]?.count ?? "0", 10),
      campaigns: parseInt(campRow[0]?.count ?? "0", 10),
      workflows: parseInt(wfRow[0]?.count ?? "0", 10),
    };
  }
}

let _svc: SaasSubcuentasService | undefined;
export function getSaasSubcuentasService(): SaasSubcuentasService {
  if (!_svc) _svc = new SaasSubcuentasService();
  return _svc;
}
export function resetSaasSubcuentasServiceForTests(): void {
  _svc = undefined;
}
