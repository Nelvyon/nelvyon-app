import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import {
  mapBillablePlanToSaasPlan,
  shouldSyncSaasTenantPlan,
  SAAS_TENANT_SELECT,
  saasTenantFromRow,
  type SaasPlan,
  type SaasTenantRow,
} from "./saasTenantMapper";

export type SaasBillingSyncMode = "dry-run" | "apply";

export type SaasBillingSyncSkipReason =
  | "NO_TENANT"
  | "NO_SUBSCRIPTION"
  | "STATUS_NOT_SYNCABLE"
  | "PLAN_UNCHANGED"
  | "VALIDATION";

export type SaasBillingSyncResult = {
  mode: SaasBillingSyncMode;
  tenantId: string | null;
  workspaceId: number | null;
  ownerUserId: string | null;
  previousPlan: SaasPlan | null;
  targetPlan: SaasPlan | null;
  subscriptionPlanId: string | null;
  subscriptionStatus: string | null;
  synced: boolean;
  skipped: boolean;
  skipReason?: SaasBillingSyncSkipReason;
  executedAt: string;
};

export type SaasBillingSyncBatchReport = {
  mode: SaasBillingSyncMode;
  executedAt: string;
  scanned: number;
  synced: number;
  skipped: number;
  errors: { workspaceId?: number; userId?: string; message: string }[];
  results: SaasBillingSyncResult[];
  /** Populated by runBackfill (Commit 3.5). */
  bySkipReason?: Record<SaasBillingSyncSkipReason, number>;
};

export type SaasBillingBackfillRunOptions = {
  workspaceId?: number;
};

export type SaasBillingSyncHint = {
  workspaceId?: number;
  userId?: string;
  planId: string;
  status: string;
};

type SubscriptionRow = {
  plan_id: string;
  status: string;
};

type TenantPlanRow = {
  id: string;
  user_id: string;
  workspace_id: number | null;
  plan: string;
};

const SUBSCRIPTION_BY_WORKSPACE_SQL = `
  SELECT plan_id, status
  FROM subscriptions
  WHERE workspace_id = $1
  ORDER BY
    CASE status
      WHEN 'active' THEN 0
      WHEN 'trialing' THEN 1
      WHEN 'past_due' THEN 2
      ELSE 9
    END,
    updated_at DESC NULLS LAST,
    id DESC
  LIMIT 1
`;

const SUBSCRIPTION_LEGACY_BY_USER_SQL = `
  SELECT plan AS plan_id, status
  FROM subscriptions
  WHERE user_id::text = $1
  LIMIT 1
`;

const TENANT_BY_WORKSPACE_SQL = `
  SELECT ${SAAS_TENANT_SELECT}
  FROM saas_tenants
  WHERE workspace_id = $1
  LIMIT 1
`;

const TENANT_BY_USER_SQL = `
  SELECT ${SAAS_TENANT_SELECT}
  FROM saas_tenants
  WHERE user_id = $1::uuid
  LIMIT 1
`;

const TENANTS_WITH_BRIDGE_SQL = `
  SELECT id, user_id, workspace_id, plan
  FROM saas_tenants
  WHERE workspace_id IS NOT NULL
`;

const UPDATE_TENANT_PLAN_SQL = `
  UPDATE saas_tenants
  SET plan = $1, updated_at = NOW()
  WHERE id = $2::uuid
    AND plan IS DISTINCT FROM $1
  RETURNING id, plan
`;

export class SaasBillingSyncService {
  constructor(private readonly db: SaasPostgresPort) {}

  async syncFromWorkspaceId(
    workspaceId: number,
    mode: SaasBillingSyncMode = "dry-run",
    hint?: Pick<SaasBillingSyncHint, "planId" | "status">,
  ): Promise<SaasBillingSyncResult> {
    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      return this.skippedResult(mode, null, workspaceId, null, "VALIDATION");
    }

    const tenant = await this.loadTenantByWorkspace(workspaceId);
    if (!tenant) {
      return this.skippedResult(mode, null, workspaceId, null, "NO_TENANT");
    }

    const subscription =
      hint !== undefined
        ? { plan_id: hint.planId, status: hint.status }
        : await this.loadSubscriptionByWorkspace(workspaceId);

    return this.applySync(mode, tenant, workspaceId, subscription);
  }

  async syncFromUserId(
    userId: string,
    mode: SaasBillingSyncMode = "dry-run",
    hint?: Pick<SaasBillingSyncHint, "planId" | "status">,
  ): Promise<SaasBillingSyncResult> {
    const trimmed = userId?.trim();
    if (!trimmed) {
      return this.skippedResult(mode, null, null, null, "VALIDATION");
    }

    const tenant = await this.loadTenantByUser(trimmed);
    if (!tenant) {
      return this.skippedResult(mode, null, null, trimmed, "NO_TENANT");
    }

    const workspaceId = tenant.workspace_id;
    if (workspaceId !== null && Number.isInteger(workspaceId)) {
      return this.syncFromWorkspaceId(workspaceId, mode, hint);
    }

    const subscription =
      hint !== undefined
        ? { plan_id: hint.planId, status: hint.status }
        : await this.loadSubscriptionLegacyByUser(trimmed);

    return this.applySync(mode, tenant, null, subscription);
  }

  async syncFromSubscriptionHint(
    hint: SaasBillingSyncHint,
    mode: SaasBillingSyncMode = "dry-run",
  ): Promise<SaasBillingSyncResult> {
    const { workspaceId, userId, planId, status } = hint;
    const override = { planId, status };

    if (workspaceId !== undefined && Number.isInteger(workspaceId) && workspaceId > 0) {
      return this.syncFromWorkspaceId(workspaceId, mode, override);
    }
    if (userId?.trim()) {
      return this.syncFromUserId(userId.trim(), mode, override);
    }
    return this.skippedResult(mode, null, workspaceId ?? null, userId ?? null, "VALIDATION");
  }

  async runBatch(mode: SaasBillingSyncMode = "dry-run"): Promise<SaasBillingSyncBatchReport> {
    const executedAt = new Date().toISOString();
    const report: SaasBillingSyncBatchReport = {
      mode,
      executedAt,
      scanned: 0,
      synced: 0,
      skipped: 0,
      errors: [],
      results: [],
    };

    const rows = await this.db.query<TenantPlanRow>(TENANTS_WITH_BRIDGE_SQL);
    report.scanned = rows.length;

    for (const row of rows) {
      const workspaceId = row.workspace_id;
      if (workspaceId === null || !Number.isInteger(workspaceId)) continue;
      try {
        const result = await this.syncFromWorkspaceId(workspaceId, mode);
        report.results.push(result);
        if (result.synced) report.synced += 1;
        else if (result.skipped) report.skipped += 1;
      } catch (e: unknown) {
        report.errors.push({
          workspaceId,
          userId: row.user_id,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return report;
  }

  async runBackfill(
    mode: SaasBillingSyncMode = "dry-run",
    options?: SaasBillingBackfillRunOptions,
  ): Promise<SaasBillingSyncBatchReport> {
    const workspaceId = options?.workspaceId;
    let report: SaasBillingSyncBatchReport;

    if (workspaceId !== undefined) {
      const executedAt = new Date().toISOString();
      report = {
        mode,
        executedAt,
        scanned: 1,
        synced: 0,
        skipped: 0,
        errors: [],
        results: [],
      };
      try {
        const result = await this.syncFromWorkspaceId(workspaceId, mode);
        report.results.push(result);
        if (result.synced) report.synced += 1;
        else if (result.skipped) report.skipped += 1;
      } catch (e: unknown) {
        report.errors.push({
          workspaceId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      report = await this.runBatch(mode);
    }

    report.bySkipReason = this.summarizeSkipReasons(report.results);
    return report;
  }

  private summarizeSkipReasons(
    results: SaasBillingSyncResult[],
  ): Record<SaasBillingSyncSkipReason, number> {
    const counts: Record<SaasBillingSyncSkipReason, number> = {
      NO_TENANT: 0,
      NO_SUBSCRIPTION: 0,
      STATUS_NOT_SYNCABLE: 0,
      PLAN_UNCHANGED: 0,
      VALIDATION: 0,
    };
    for (const r of results) {
      if (r.skipReason) {
        counts[r.skipReason] += 1;
      }
    }
    return counts;
  }

  private async applySync(
    mode: SaasBillingSyncMode,
    tenant: SaasTenantRow,
    workspaceId: number | null,
    subscription: SubscriptionRow | null,
  ): Promise<SaasBillingSyncResult> {
    const executedAt = new Date().toISOString();
    const base = {
      mode,
      tenantId: tenant.id,
      workspaceId,
      ownerUserId: tenant.user_id,
      executedAt,
      previousPlan: saasTenantFromRow(tenant).plan,
      targetPlan: null as SaasPlan | null,
      subscriptionPlanId: null as string | null,
      subscriptionStatus: null as string | null,
      synced: false,
      skipped: true,
    };

    if (!subscription) {
      return { ...base, skipReason: "NO_SUBSCRIPTION" };
    }

    base.subscriptionPlanId = subscription.plan_id;
    base.subscriptionStatus = subscription.status;

    if (!shouldSyncSaasTenantPlan(subscription.status)) {
      return { ...base, skipReason: "STATUS_NOT_SYNCABLE" };
    }

    const targetPlan = mapBillablePlanToSaasPlan(subscription.plan_id);
    base.targetPlan = targetPlan;

    if (base.previousPlan === targetPlan) {
      return { ...base, skipReason: "PLAN_UNCHANGED" };
    }

    if (mode === "dry-run") {
      return { ...base, synced: true, skipped: false };
    }

    const updated = await this.db.query<{ id: string; plan: string }>(UPDATE_TENANT_PLAN_SQL, [
      targetPlan,
      tenant.id,
    ]);
    if (updated.length === 0) {
      return { ...base, skipReason: "PLAN_UNCHANGED" };
    }

    return { ...base, synced: true, skipped: false };
  }

  private skippedResult(
    mode: SaasBillingSyncMode,
    tenantId: string | null,
    workspaceId: number | null,
    ownerUserId: string | null,
    skipReason: SaasBillingSyncSkipReason,
  ): SaasBillingSyncResult {
    return {
      mode,
      tenantId,
      workspaceId,
      ownerUserId,
      previousPlan: null,
      targetPlan: null,
      subscriptionPlanId: null,
      subscriptionStatus: null,
      synced: false,
      skipped: true,
      skipReason,
      executedAt: new Date().toISOString(),
    };
  }

  private async loadTenantByWorkspace(workspaceId: number): Promise<SaasTenantRow | null> {
    const rows = await this.db.query<SaasTenantRow>(TENANT_BY_WORKSPACE_SQL, [workspaceId]);
    return rows[0] ?? null;
  }

  private async loadTenantByUser(userId: string): Promise<SaasTenantRow | null> {
    const rows = await this.db.query<SaasTenantRow>(TENANT_BY_USER_SQL, [userId]);
    return rows[0] ?? null;
  }

  private async loadSubscriptionByWorkspace(workspaceId: number): Promise<SubscriptionRow | null> {
    const rows = await this.db.query<SubscriptionRow>(SUBSCRIPTION_BY_WORKSPACE_SQL, [workspaceId]);
    return rows[0] ?? null;
  }

  private async loadSubscriptionLegacyByUser(userId: string): Promise<SubscriptionRow | null> {
    const rows = await this.db.query<SubscriptionRow>(SUBSCRIPTION_LEGACY_BY_USER_SQL, [userId]);
    return rows[0] ?? null;
  }
}

let cachedBillingSync: SaasBillingSyncService | undefined;

export function getSaasBillingSyncService(): SaasBillingSyncService {
  if (!cachedBillingSync) {
    cachedBillingSync = new SaasBillingSyncService(DbClient.getInstance());
  }
  return cachedBillingSync;
}

export function resetSaasBillingSyncServiceForTests(): void {
  cachedBillingSync = undefined;
}
