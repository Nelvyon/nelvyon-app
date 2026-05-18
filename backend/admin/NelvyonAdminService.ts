import { DbClient } from "../db/DbClient";

export interface SystemStats {
  totalTenants: number;
  activeTenants: number;
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalContacts: number;
  totalCampanias: number;
  totalWorkflows: number;
}

export interface ActivityLog {
  id: string;
  tenantId: string;
  eventType: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminJob {
  jobId: string;
  serviceId: string;
  tenantId: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTenant {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  plan: "starter" | "pro" | "enterprise";
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  userEmail: string;
  jobsCount: number;
  lastActivityAt: string | null;
}

export interface AdminTenantDetail {
  tenant: AdminTenant;
  contactsCount: number;
  campaniasCount: number;
  workflowsCount: number;
  jobsCount: number;
  recentJobs: AdminJob[];
}

export interface AdminDbPort {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

type CountRow = { n: string | number };
type TenantRow = {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  plan: "starter" | "pro" | "enterprise";
  onboarding_completed: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  user_email: string | null;
  jobs_count: string | number | null;
  last_activity_at: Date | string | null;
};
type JobRow = {
  job_id: string;
  service_id: string;
  client_id: string;
  status: string;
  progress: number | string;
  error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};
type ActivityRow = {
  id: string;
  tenant_id: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
};
type RoleRow = { role: string };

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

function rowToJob(r: JobRow): AdminJob {
  return {
    jobId: r.job_id,
    serviceId: r.service_id,
    tenantId: r.client_id,
    status: r.status,
    progress: toNum(r.progress),
    error: r.error,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function rowToTenant(r: TenantRow): AdminTenant {
  return {
    id: r.id,
    userId: r.user_id,
    companyName: r.company_name,
    industry: r.industry,
    plan: r.plan,
    onboardingCompleted: r.onboarding_completed,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
    userEmail: r.user_email ?? "",
    jobsCount: toNum(r.jobs_count),
    lastActivityAt: r.last_activity_at ? toIso(r.last_activity_at) : null,
  };
}

export class NelvyonAdminService {
  constructor(private readonly db: AdminDbPort) {}

  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const rows = await this.db.query<RoleRow>(`SELECT role FROM os_users WHERE id = $1 LIMIT 1`, [userId]);
      const role = rows[0]?.role;
      if (typeof role === "string" && role.toLowerCase() === "admin") return true;
    } catch {
      // fallback below for installs without os_users
    }
    try {
      const rows = await this.db.query<RoleRow>(`SELECT role FROM nelvyon_users WHERE user_id = $1 LIMIT 1`, [userId]);
      const role = rows[0]?.role;
      return typeof role === "string" && role.toLowerCase() === "admin";
    } catch {
      return false;
    }
  }

  async getSystemStats(): Promise<SystemStats> {
    const [totalTenants, activeTenants, totalJobs, runningJobs, completedJobs, failedJobs, totalContacts, totalCampanias, totalWorkflows] =
      await Promise.all([
        this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM saas_tenants`),
        this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM saas_tenants WHERE onboarding_completed = TRUE`),
        this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM os_jobs`),
        this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM os_jobs WHERE status = 'running'`),
        this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM os_jobs WHERE status = 'completed'`),
        this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM os_jobs WHERE status = 'failed'`),
        this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM saas_contacts`),
        this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM saas_campanias`),
        this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM saas_workflows`),
      ]);
    return {
      totalTenants: toNum(totalTenants[0]?.n),
      activeTenants: toNum(activeTenants[0]?.n),
      totalJobs: toNum(totalJobs[0]?.n),
      runningJobs: toNum(runningJobs[0]?.n),
      completedJobs: toNum(completedJobs[0]?.n),
      failedJobs: toNum(failedJobs[0]?.n),
      totalContacts: toNum(totalContacts[0]?.n),
      totalCampanias: toNum(totalCampanias[0]?.n),
      totalWorkflows: toNum(totalWorkflows[0]?.n),
    };
  }

  async getTenants(filters?: { plan?: "starter" | "pro" | "enterprise"; search?: string }): Promise<AdminTenant[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters?.plan) {
      where.push(`st.plan = $${idx++}`);
      params.push(filters.plan);
    }
    if (filters?.search && filters.search.trim()) {
      where.push(`st.company_name ILIKE $${idx++}`);
      params.push(`%${filters.search.trim()}%`);
    }
    const rows = await this.db.query<TenantRow>(
      `SELECT
        st.id, st.user_id, st.company_name, st.industry, st.plan, st.onboarding_completed, st.created_at, st.updated_at,
        COALESCE(nu.email, '') AS user_email,
        COALESCE((SELECT COUNT(*) FROM os_jobs j WHERE j.client_id = nu.tenant_id), 0)::text AS jobs_count,
        (SELECT MAX(created_at) FROM saas_activity_log a WHERE a.tenant_id = st.id) AS last_activity_at
      FROM saas_tenants st
      LEFT JOIN nelvyon_users nu ON nu.user_id = st.user_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY st.created_at DESC`,
      params,
    );
    return rows.map(rowToTenant);
  }

  async getTenant(tenantId: string): Promise<AdminTenantDetail | null> {
    const rows = await this.db.query<TenantRow>(
      `SELECT
        st.id, st.user_id, st.company_name, st.industry, st.plan, st.onboarding_completed, st.created_at, st.updated_at,
        COALESCE(nu.email, '') AS user_email,
        COALESCE((SELECT COUNT(*) FROM os_jobs j WHERE j.client_id = nu.tenant_id), 0)::text AS jobs_count,
        (SELECT MAX(created_at) FROM saas_activity_log a WHERE a.tenant_id = st.id) AS last_activity_at
      FROM saas_tenants st
      LEFT JOIN nelvyon_users nu ON nu.user_id = st.user_id
      WHERE st.id = $1
      LIMIT 1`,
      [tenantId],
    );
    const row = rows[0];
    if (!row) return null;

    const [contactsCountRows, campaniasCountRows, workflowsCountRows, jobsRows] = await Promise.all([
      this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM saas_contacts WHERE tenant_id = $1`, [tenantId]),
      this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM saas_campanias WHERE tenant_id = $1`, [tenantId]),
      this.db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM saas_workflows WHERE tenant_id = $1`, [tenantId]),
      this.db.query<JobRow>(
        `SELECT j.job_id, j.service_id, j.client_id, j.status, j.progress, j.error, j.created_at, j.updated_at
         FROM os_jobs j
         WHERE j.client_id = (SELECT nu.tenant_id FROM nelvyon_users nu WHERE nu.user_id = $1 LIMIT 1)
         ORDER BY j.created_at DESC
         LIMIT 10`,
        [row.user_id],
      ),
    ]);

    return {
      tenant: rowToTenant(row),
      contactsCount: toNum(contactsCountRows[0]?.n),
      campaniasCount: toNum(campaniasCountRows[0]?.n),
      workflowsCount: toNum(workflowsCountRows[0]?.n),
      jobsCount: toNum(row.jobs_count),
      recentJobs: jobsRows.map(rowToJob),
    };
  }

  async getJobs(filters?: { status?: string; serviceId?: string; tenantId?: string }): Promise<AdminJob[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters?.status) {
      where.push(`j.status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters?.serviceId) {
      where.push(`j.service_id = $${idx++}`);
      params.push(filters.serviceId);
    }
    if (filters?.tenantId) {
      const tenantRows = await this.db.query<{ tenant_id: string }>(
        `SELECT nu.tenant_id
         FROM saas_tenants st
         JOIN nelvyon_users nu ON nu.user_id = st.user_id
         WHERE st.id = $1
         LIMIT 1`,
        [filters.tenantId],
      );
      const authTenantId = tenantRows[0]?.tenant_id;
      if (!authTenantId) return [];
      where.push(`j.client_id = $${idx++}`);
      params.push(authTenantId);
    }
    const rows = await this.db.query<JobRow>(
      `SELECT j.job_id, j.service_id, j.client_id, j.status, j.progress, j.error, j.created_at, j.updated_at
       FROM os_jobs j
       ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY j.created_at DESC`,
      params,
    );
    return rows.map(rowToJob);
  }

  async getRecentActivity(limit = 20): Promise<ActivityLog[]> {
    const safeLimit = Number.isInteger(limit) ? Math.min(100, Math.max(1, limit)) : 20;
    const rows = await this.db.query<ActivityRow>(
      `SELECT id, tenant_id, event_type, description, metadata, created_at
       FROM saas_activity_log
       ORDER BY created_at DESC
       LIMIT $1`,
      [safeLimit],
    );
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      eventType: r.event_type,
      description: r.description,
      metadata: r.metadata ?? {},
      createdAt: toIso(r.created_at),
    }));
  }
}

let cached: NelvyonAdminService | undefined;

export function getNelvyonAdminService(): NelvyonAdminService {
  if (!cached) cached = new NelvyonAdminService(DbClient.getInstance());
  return cached;
}

export function resetNelvyonAdminServiceForTests(): void {
  cached = undefined;
}
