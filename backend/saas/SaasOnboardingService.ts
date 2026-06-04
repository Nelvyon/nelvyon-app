import { DbClient } from "../db/DbClient";

import { SAAS_TENANT_SELECT, saasTenantFromRow, type SaasPlan, type SaasTenantRow } from "./saasTenantMapper";

/** Postgres port for SaaS onboarding (mockable in tests). */
export interface SaasPostgresPort {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export type { SaasPlan };

export interface SaasTenant {
  id: string;
  userId: string;
  /** Legacy workspace INTEGER; ver SaasTenantBridgeService. */
  workspaceId: number | null;
  companyName: string;
  industry: string;
  plan: SaasPlan;
  website: string | null;
  phone: string | null;
  employees: string | null;
  goals: string[];
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
}

export type { SaasTenantRow };

export type CreateSaasTenantInput = {
  companyName: string;
  industry: string;
  plan?: SaasPlan;
  website?: string | null;
  phone?: string | null;
  employees?: string | null;
  goals?: string[];
};

export type UpdateSaasTenantPatch = Partial<{
  companyName: string;
  industry: string;
  plan: SaasPlan;
  website: string | null;
  phone: string | null;
  employees: string | null;
  goals: string[];
}>;

export type SaasOnboardingErrorCode =
  | "NOT_FOUND"
  | "INVALID_STEP"
  | "ONBOARDING_INCOMPLETE"
  | "VALIDATION"
  | "CONSTRAINT";

export class SaasOnboardingError extends Error {
  readonly code: SaasOnboardingErrorCode;

  constructor(message: string, code: SaasOnboardingErrorCode) {
    super(message);
    this.name = "SaasOnboardingError";
    this.code = code;
  }
}

function isPgCheckViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23514";
}

export { assertSaasPlan, SaasPlanValidationError } from "./saasTenantMapper";

async function ensureWorkspaceBridge(userId: string, tenant: SaasTenant): Promise<SaasTenant> {
  if (tenant.workspaceId != null) {
    return tenant;
  }
  const dbUrl = process.env.DATABASE_URL;
  if (typeof dbUrl !== "string" || dbUrl.trim().length === 0) {
    return tenant;
  }
  const { getSaasTenantBridgeService } = await import("./SaasTenantBridgeService");
  const wid = await getSaasTenantBridgeService().linkPrimaryWorkspace(userId, tenant.id);
  return wid != null ? { ...tenant, workspaceId: wid } : tenant;
}

export class SaasOnboardingService {
  constructor(private readonly db: SaasPostgresPort) {}

  async createTenant(userId: string, data: CreateSaasTenantInput): Promise<SaasTenant> {
    const companyName = data.companyName.trim();
    const industry = data.industry.trim();
    if (companyName.length === 0 || industry.length === 0) {
      throw new SaasOnboardingError("companyName and industry are required", "VALIDATION");
    }
    const plan = data.plan ?? "starter";
    const { assertSaasPlan: assertPlan } = await import("./saasTenantMapper");
    assertPlan(plan);
    const goals = data.goals ?? [];

    try {
      const inserted = await this.db.query<SaasTenantRow>(
        `INSERT INTO saas_tenants (user_id, company_name, industry, plan, website, phone, employees, goals)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id) DO NOTHING
         RETURNING ${SAAS_TENANT_SELECT}`,
        [
          userId,
          companyName,
          industry,
          plan,
          data.website ?? null,
          data.phone ?? null,
          data.employees ?? null,
          goals,
        ],
      );
      const row = inserted[0];
      if (row) {
        return ensureWorkspaceBridge(userId, saasTenantFromRow(row));
      }
    } catch (e: unknown) {
      if (isPgCheckViolation(e)) {
        throw new SaasOnboardingError("Plan violates database constraint", "CONSTRAINT");
      }
      throw e;
    }

    const existing = await this.getTenant(userId);
    if (!existing) {
      throw new SaasOnboardingError("Failed to create or load tenant", "CONSTRAINT");
    }
    return existing;
  }

  async getTenant(userId: string): Promise<SaasTenant | null> {
    const rows = await this.db.query<SaasTenantRow>(
      `SELECT ${SAAS_TENANT_SELECT} FROM saas_tenants WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    return r ? saasTenantFromRow(r) : null;
  }

  async updateOnboardingStep(userId: string, step: number, data: UpdateSaasTenantPatch = {}): Promise<SaasTenant> {
    if (step > 4 || step < 1) {
      throw new SaasOnboardingError("Step must be between 1 and 4", "INVALID_STEP");
    }
    const existing = await this.getTenant(userId);
    if (!existing) {
      throw new SaasOnboardingError("Tenant not found", "NOT_FOUND");
    }

    const companyName = data.companyName !== undefined ? data.companyName.trim() : undefined;
    if (companyName !== undefined && companyName.length === 0) {
      throw new SaasOnboardingError("companyName cannot be empty", "VALIDATION");
    }
    const industry = data.industry !== undefined ? data.industry.trim() : undefined;
    if (industry !== undefined && industry.length === 0) {
      throw new SaasOnboardingError("industry cannot be empty", "VALIDATION");
    }

    let planSql: SaasPlan | undefined;
    if (data.plan !== undefined) {
      const { assertSaasPlan: assertPlan } = await import("./saasTenantMapper");
      planSql = assertPlan(data.plan);
    }

    try {
      const rows = await this.db.query<SaasTenantRow>(
        `UPDATE saas_tenants SET
           company_name = COALESCE($2, company_name),
           industry = COALESCE($3, industry),
           plan = COALESCE($4, plan),
           website = COALESCE($5, website),
           phone = COALESCE($6, phone),
           employees = COALESCE($7, employees),
           goals = COALESCE($8, goals),
           onboarding_step = $9,
           updated_at = NOW()
         WHERE user_id = $1
         RETURNING ${SAAS_TENANT_SELECT}`,
        [
          userId,
          companyName ?? null,
          industry ?? null,
          planSql ?? null,
          data.website === undefined ? null : data.website,
          data.phone === undefined ? null : data.phone,
          data.employees === undefined ? null : data.employees,
          data.goals === undefined ? null : data.goals,
          step,
        ],
      );
      const row = rows[0];
      if (!row) {
        throw new SaasOnboardingError("Tenant not found", "NOT_FOUND");
      }
      return saasTenantFromRow(row);
    } catch (e: unknown) {
      if (isPgCheckViolation(e)) {
        throw new SaasOnboardingError("Plan violates database constraint", "CONSTRAINT");
      }
      throw e;
    }
  }

  async completeOnboarding(userId: string): Promise<SaasTenant> {
    const existing = await this.getTenant(userId);
    if (!existing) {
      throw new SaasOnboardingError("Tenant not found", "NOT_FOUND");
    }
    if (existing.onboardingStep < 4) {
      throw new SaasOnboardingError("Complete all onboarding steps first", "ONBOARDING_INCOMPLETE");
    }
    if (existing.onboardingCompleted) {
      return ensureWorkspaceBridge(userId, existing);
    }
    const rows = await this.db.query<SaasTenantRow>(
      `UPDATE saas_tenants SET onboarding_completed = TRUE, updated_at = NOW()
       WHERE user_id = $1
       RETURNING ${SAAS_TENANT_SELECT}`,
      [userId],
    );
    const row = rows[0];
    if (!row) {
      throw new SaasOnboardingError("Tenant not found", "NOT_FOUND");
    }
    return ensureWorkspaceBridge(userId, saasTenantFromRow(row));
  }
}

let cachedSaasOnboarding: SaasOnboardingService | undefined;

export function getSaasOnboardingService(): SaasOnboardingService {
  if (!cachedSaasOnboarding) {
    cachedSaasOnboarding = new SaasOnboardingService(DbClient.getInstance());
  }
  return cachedSaasOnboarding;
}

export function resetSaasOnboardingServiceForTests(): void {
  cachedSaasOnboarding = undefined;
}
