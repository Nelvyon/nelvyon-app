import type { SaasPostgresPort, SaasPlan } from "./SaasOnboardingService";
import { assertBelowPlanLimit, type SaasPlanResource } from "./saasPlanLimits";

type CountRow = { n: string | number };

function toCount(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

async function getTenantPlan(db: SaasPostgresPort, tenantId: string): Promise<SaasPlan> {
  const rows = await db.query<{ plan: SaasPlan }>(
    `SELECT plan FROM saas_tenants WHERE id = $1 LIMIT 1`,
    [tenantId],
  );
  return rows[0]?.plan ?? "starter";
}

async function countResource(db: SaasPostgresPort, tenantId: string, resource: SaasPlanResource): Promise<number> {
  switch (resource) {
    case "contacts": {
      const rows = await db.query<CountRow>(
        `SELECT COUNT(*)::int AS n FROM saas_contacts WHERE tenant_id = $1`,
        [tenantId],
      );
      return toCount(rows[0]?.n);
    }
    case "deals": {
      const rows = await db.query<CountRow>(
        `SELECT COUNT(*)::int AS n FROM saas_deals WHERE tenant_id = $1`,
        [tenantId],
      );
      return toCount(rows[0]?.n);
    }
    case "campanias": {
      const rows = await db.query<CountRow>(
        `SELECT COUNT(*)::int AS n FROM saas_campanias WHERE tenant_id = $1`,
        [tenantId],
      );
      return toCount(rows[0]?.n);
    }
    case "workflows": {
      const rows = await db.query<CountRow>(
        `SELECT COUNT(*)::int AS n FROM saas_workflows WHERE tenant_id = $1`,
        [tenantId],
      );
      return toCount(rows[0]?.n);
    }
    case "users": {
      const rows = await db.query<CountRow>(
        `SELECT COUNT(*)::int AS n FROM saas_tenants WHERE id = $1`,
        [tenantId],
      );
      return toCount(rows[0]?.n);
    }
    default:
      return 0;
  }
}

/** Assert tenant can create one more resource (uses caller's db — testable with mocks). */
export async function assertSaasPlanCanCreate(
  db: SaasPostgresPort,
  tenantId: string,
  resource: SaasPlanResource,
): Promise<void> {
  const plan = await getTenantPlan(db, tenantId);
  const current = await countResource(db, tenantId, resource);
  assertBelowPlanLimit(plan, resource, current);
}

export async function getSaasResourceUsage(
  db: SaasPostgresPort,
  tenantId: string,
  resource: SaasPlanResource,
): Promise<number> {
  return countResource(db, tenantId, resource);
}

export async function getSaasTenantPlan(db: SaasPostgresPort, tenantId: string): Promise<SaasPlan> {
  return getTenantPlan(db, tenantId);
}
