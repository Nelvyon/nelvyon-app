import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort, SaasTenant } from "./SaasOnboardingService";

export interface ActivityLog {
  id: string;
  tenantId: string;
  eventType: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardSummary {
  tenant: SaasTenant;
  activeJobs: number;
  completedJobs: number;
  totalSpend: number;
  recentActivity: ActivityLog[];
}

type TenantRow = {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  plan: "starter" | "pro" | "enterprise";
  website: string | null;
  phone: string | null;
  employees: string | null;
  goals: string[] | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: Date | string;
  updated_at: Date | string;
  auth_tenant_id: string;
};

type ActivityRow = {
  id: string;
  tenant_id: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
};

type CountRow = { n: string | number };

type SpendRow = { total: string | number | null };

export class SaasDashboardError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION",
  ) {
    super(message);
    this.name = "SaasDashboardError";
  }
}

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function toNum(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function rowToTenant(r: TenantRow): SaasTenant {
  return {
    id: r.id,
    userId: r.user_id,
    companyName: r.company_name,
    industry: r.industry,
    plan: r.plan,
    website: r.website,
    phone: r.phone,
    employees: r.employees,
    goals: r.goals ?? [],
    onboardingCompleted: r.onboarding_completed,
    onboardingStep: r.onboarding_step,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function rowToActivity(r: ActivityRow): ActivityLog {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    eventType: r.event_type,
    description: r.description,
    metadata: r.metadata ?? {},
    createdAt: toIso(r.created_at),
  };
}

export class SaasDashboardService {
  constructor(private readonly db: SaasPostgresPort) {}

  private async fetchTenantWithAuthTenant(tenantId: string): Promise<{ tenant: SaasTenant; authTenantId: string }> {
    const rows = await this.db.query<TenantRow>(
      `SELECT st.id, st.user_id, st.company_name, st.industry, st.plan, st.website, st.phone, st.employees, st.goals,
              st.onboarding_completed, st.onboarding_step, st.created_at, st.updated_at, nu.tenant_id AS auth_tenant_id
       FROM saas_tenants st
       JOIN nelvyon_users nu ON nu.user_id = st.user_id
       WHERE st.id = $1
       LIMIT 1`,
      [tenantId],
    );
    const row = rows[0];
    if (!row) {
      throw new SaasDashboardError("Tenant not found", "NOT_FOUND");
    }
    return { tenant: rowToTenant(row), authTenantId: row.auth_tenant_id };
  }

  async getRecentActivity(tenantId: string, limit = 10): Promise<ActivityLog[]> {
    const safeLimit = Number.isInteger(limit) ? Math.min(50, Math.max(1, limit)) : 10;
    const rows = await this.db.query<ActivityRow>(
      `SELECT id, tenant_id, event_type, description, metadata, created_at
       FROM saas_activity_log
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, safeLimit],
    );
    return rows.map(rowToActivity);
  }

  async logActivity(tenantId: string, eventType: string, description: string, metadata?: Record<string, unknown>): Promise<void> {
    const et = eventType.trim();
    const desc = description.trim();
    if (et.length === 0 || desc.length === 0) {
      throw new SaasDashboardError("eventType and description are required", "VALIDATION");
    }
    await this.db.query(
      `INSERT INTO saas_activity_log (tenant_id, event_type, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      [tenantId, et, desc, metadata ?? {}],
    );
  }

  async getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
    const { tenant, authTenantId } = await this.fetchTenantWithAuthTenant(tenantId);

    const [activeRows, completedRows, spendRows, recentActivity] = await Promise.all([
      this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM os_jobs WHERE client_id = $1 AND status = 'running'`, [authTenantId]),
      this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM os_jobs WHERE client_id = $1 AND status = 'completed'`, [authTenantId]),
      this.db.query<SpendRow>(
        `SELECT CASE
                  WHEN to_regclass('public.billing_payments') IS NULL THEN 0
                  ELSE COALESCE((SELECT SUM(amount_cents) / 100.0 FROM billing_payments WHERE tenant_id = $1), 0)
                END AS total`,
        [authTenantId],
      ),
      this.getRecentActivity(tenantId, 10),
    ]);

    return {
      tenant,
      activeJobs: toNum(activeRows[0]?.n),
      completedJobs: toNum(completedRows[0]?.n),
      totalSpend: toNum(spendRows[0]?.total),
      recentActivity,
    };
  }
}

let cached: SaasDashboardService | undefined;

export function getSaasDashboardService(): SaasDashboardService {
  if (!cached) {
    cached = new SaasDashboardService(DbClient.getInstance());
  }
  return cached;
}

export function resetSaasDashboardServiceForTests(): void {
  cached = undefined;
}
