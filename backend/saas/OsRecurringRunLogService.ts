/**
 * O19 — OsRecurringRunLogService
 * Audit + idempotency log for monthly recurring services (SEO/social/ads/reputation).
 * One row per (tenant, service_type, period_key=YYYY-MM); re-running a completed
 * period is a no-op (skipped), so deliverables never duplicate.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type RecurringRunServiceType = "seo" | "social" | "ads" | "reputation";
export type RecurringRunStatus = "queued" | "running" | "completed" | "failed" | "skipped";

/** Map the deliverable service types to the short run-log service types. */
export const RECURRING_TYPE_MAP: Record<string, RecurringRunServiceType> = {
  seo_report: "seo",
  social_calendar: "social",
  ads_snapshot: "ads",
  reputation_sync: "reputation",
};

export type RecurringRun = {
  id: string;
  tenantId: string;
  workspaceId: number | null;
  serviceType: RecurringRunServiceType;
  periodKey: string;
  status: RecurringRunStatus;
  deliverableId: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
};

export type RecurringRunFilters = {
  tenantId?: string;
  serviceType?: RecurringRunServiceType;
  periodKey?: string;
  status?: RecurringRunStatus;
  limit?: number;
};

export type RecurringRunSummary = {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  byService: Record<string, number>;
};

export type OsRecurringRunLogErrorCode = "NOT_FOUND" | "VALIDATION";

export class OsRecurringRunLogError extends Error {
  constructor(
    public readonly code: OsRecurringRunLogErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OsRecurringRunLogError";
  }
}

type RunRow = {
  id: string;
  tenant_id: string;
  workspace_id: number | null;
  service_type: RecurringRunServiceType;
  period_key: string;
  status: RecurringRunStatus;
  deliverable_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
};

function rowToRun(r: RunRow): RecurringRun {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    workspaceId: r.workspace_id,
    serviceType: r.service_type,
    periodKey: r.period_key,
    status: r.status,
    deliverableId: r.deliverable_id,
    errorMessage: r.error_message,
    metadata: r.metadata ?? {},
    startedAt: r.started_at,
    completedAt: r.completed_at,
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsRecurringRunLogService | null = null;

export function getOsRecurringRunLogService(): OsRecurringRunLogService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new OsRecurringRunLogService(DbClient.getInstance());
  }
  return _instance;
}

export function resetOsRecurringRunLogServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsRecurringRunLogService {
  constructor(private readonly db: SaasPostgresPort) {}

  /** Current (or given) month as YYYY-MM. */
  periodKey(date: Date = new Date()): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  /** Start (or reopen) a run; idempotent on (tenant, service, period). */
  async startRun(
    tenantId: string,
    serviceType: RecurringRunServiceType,
    periodKey: string,
    workspaceId?: number | null,
  ): Promise<RecurringRun> {
    const rows = await this.db.query<RunRow>(
      `INSERT INTO os_recurring_run_log (tenant_id, workspace_id, service_type, period_key, status)
       VALUES ($1, $2, $3, $4, 'running')
       ON CONFLICT (tenant_id, service_type, period_key)
       DO UPDATE SET status = CASE
                       WHEN os_recurring_run_log.status = 'completed' THEN 'completed'
                       ELSE 'running' END,
                     started_at = CASE
                       WHEN os_recurring_run_log.status = 'completed' THEN os_recurring_run_log.started_at
                       ELSE NOW() END
       RETURNING *`,
      [tenantId, workspaceId ?? null, serviceType, periodKey],
    );
    return rowToRun(rows[0]!);
  }

  async completeRun(id: string, deliverableId?: string | null, metadata?: Record<string, unknown>): Promise<RecurringRun> {
    const rows = await this.db.query<RunRow>(
      `UPDATE os_recurring_run_log
       SET status = 'completed', deliverable_id = COALESCE($2, deliverable_id),
           metadata = metadata || $3::jsonb, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, deliverableId ?? null, JSON.stringify(metadata ?? {})],
    );
    if (!rows[0]) throw new OsRecurringRunLogError("NOT_FOUND", `Run ${id} no encontrado`);
    return rowToRun(rows[0]);
  }

  async failRun(id: string, error: string): Promise<RecurringRun> {
    const rows = await this.db.query<RunRow>(
      `UPDATE os_recurring_run_log
       SET status = 'failed', error_message = $2, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, error],
    );
    if (!rows[0]) throw new OsRecurringRunLogError("NOT_FOUND", `Run ${id} no encontrado`);
    return rowToRun(rows[0]);
  }

  /** Idempotent skip — records a duplicate attempt without re-generating. */
  async skipRun(
    tenantId: string,
    serviceType: RecurringRunServiceType,
    periodKey: string,
    reason: string,
  ): Promise<RecurringRun> {
    const rows = await this.db.query<RunRow>(
      `INSERT INTO os_recurring_run_log (tenant_id, service_type, period_key, status, metadata, completed_at)
       VALUES ($1, $2, $3, 'skipped', $4::jsonb, NOW())
       ON CONFLICT (tenant_id, service_type, period_key)
       DO UPDATE SET metadata = os_recurring_run_log.metadata || $4::jsonb
       RETURNING *`,
      [tenantId, serviceType, periodKey, JSON.stringify({ skipReason: reason })],
    );
    return rowToRun(rows[0]!);
  }

  /**
   * Record the result of a monthly generation run for one tenant.
   * Newly-created deliverables → completed; types that already existed → skipped.
   */
  async recordGeneration(
    tenantId: string,
    periodKey: string,
    generated: Array<{ serviceType: string; deliverableId?: string }>,
    opts: { workspaceId?: number | null; allTypes?: RecurringRunServiceType[] } = {},
  ): Promise<RecurringRun[]> {
    const allTypes = opts.allTypes ?? (["seo", "social", "ads"] as RecurringRunServiceType[]);
    const generatedShort = new Map<RecurringRunServiceType, string | undefined>();
    for (const g of generated) {
      const short = RECURRING_TYPE_MAP[g.serviceType] ?? (g.serviceType as RecurringRunServiceType);
      generatedShort.set(short, g.deliverableId);
    }

    const out: RecurringRun[] = [];
    for (const type of allTypes) {
      if (generatedShort.has(type)) {
        const run = await this.startRun(tenantId, type, periodKey, opts.workspaceId);
        out.push(await this.completeRun(run.id, generatedShort.get(type) ?? null, { source: "generation" }));
      } else {
        out.push(await this.skipRun(tenantId, type, periodKey, "ya generado este periodo (idempotente)"));
      }
    }
    return out;
  }

  async listRuns(filters: RecurringRunFilters = {}): Promise<RecurringRun[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.tenantId) { conditions.push(`tenant_id = $${idx++}`); params.push(filters.tenantId); }
    if (filters.serviceType) { conditions.push(`service_type = $${idx++}`); params.push(filters.serviceType); }
    if (filters.periodKey) { conditions.push(`period_key = $${idx++}`); params.push(filters.periodKey); }
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
    const rows = await this.db.query<RunRow>(
      `SELECT * FROM os_recurring_run_log ${where} ORDER BY started_at DESC LIMIT $${idx}`,
      [...params, limit],
    );
    return rows.map(rowToRun);
  }

  async getSummary(): Promise<RecurringRunSummary> {
    const rows = await this.db.query<{ service_type: string; status: RecurringRunStatus; count: string }>(
      `SELECT service_type, status, COUNT(*) AS count
       FROM os_recurring_run_log
       WHERE started_at >= NOW() - INTERVAL '30 days'
       GROUP BY service_type, status`,
    );
    const summary: RecurringRunSummary = { total: 0, completed: 0, failed: 0, skipped: 0, byService: {} };
    for (const r of rows) {
      const n = parseInt(r.count, 10);
      summary.total += n;
      if (r.status === "completed") summary.completed += n;
      if (r.status === "failed") summary.failed += n;
      if (r.status === "skipped") summary.skipped += n;
      summary.byService[r.service_type] = (summary.byService[r.service_type] ?? 0) + n;
    }
    return summary;
  }
}
