/**
 * O20 — OsLearningLoopProdService
 * Production orchestrator for the GA4 learning loop: aggregates GA4 sector CVR,
 * re-ranks templates (autonomous M/N/P), persists seed learning ranks, and writes
 * an idempotent audit log. Standalone — does NOT modify OsLearningService.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Injectable ports (keep the loop testable without GA4 / filesystem) ───────────

export type LearningGa4Port = {
  /** Active GA4 integration user ids. */
  listActiveGa4UserIds(): Promise<string[]>;
  /** Run the per-user learning loop → CVR weights. */
  runForUser(userId: string): Promise<{ weights: Record<string, number>; totalSessions: number }>;
  /** 'real' | 'mock' | 'none' — for honest UI labeling (no secrets). */
  mode(): "real" | "mock" | "none";
};

export type LearningRefreshPort = {
  run(opts: { realisticMock: boolean }): Promise<{ templatesRanked: number; alerts: number }>;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type LearningTriggerSource = "cron" | "manual" | "autopilot";
export type LearningRunStatus = "running" | "completed" | "failed" | "skipped";

export type LearningRunStats = {
  ga4Users: number;
  sectorsUpdated: number;
  templatesRanked: number;
  seedsReranked: number;
};

export type LearningRun = {
  id: string;
  periodKey: string;
  triggerSource: LearningTriggerSource;
  status: LearningRunStatus;
  ga4Users: number;
  sectorsUpdated: number;
  templatesRanked: number;
  seedsReranked: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
};

export type LearningRunFilters = { status?: LearningRunStatus; periodKey?: string; limit?: number };

export type LearningRunSummary = {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  avgSectorsUpdated: number;
};

export type RunProdLoopResult = {
  runId: string | null;
  periodKey: string;
  status: LearningRunStatus;
  skipped: boolean;
  stats: LearningRunStats;
  partialErrors: string[];
};

export type OsLearningLoopErrorCode = "NOT_FOUND";

export class OsLearningLoopError extends Error {
  constructor(public readonly code: OsLearningLoopErrorCode, message: string) {
    super(message);
    this.name = "OsLearningLoopError";
  }
}

type RunRow = {
  id: string;
  period_key: string;
  trigger_source: LearningTriggerSource;
  status: LearningRunStatus;
  ga4_users: number;
  sectors_updated: number;
  templates_ranked: number;
  seeds_reranked: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
};

function rowToRun(r: RunRow): LearningRun {
  return {
    id: r.id,
    periodKey: r.period_key,
    triggerSource: r.trigger_source,
    status: r.status,
    ga4Users: r.ga4_users,
    sectorsUpdated: r.sectors_updated,
    templatesRanked: r.templates_ranked,
    seedsReranked: r.seeds_reranked,
    errorMessage: r.error_message,
    metadata: r.metadata ?? {},
    startedAt: r.started_at,
    completedAt: r.completed_at,
  };
}

// ── Default ports ────────────────────────────────────────────────────────────────

function defaultGa4Port(db: SaasPostgresPort): LearningGa4Port {
  return {
    async listActiveGa4UserIds() {
      try {
        const rows = await db.query<{ user_id: string }>(
          `SELECT DISTINCT user_id::text AS user_id FROM integration_ga4 WHERE is_active = true AND user_id IS NOT NULL`,
        );
        return rows.map((r) => r.user_id).filter(Boolean);
      } catch {
        return [];
      }
    },
    async runForUser(userId) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getOsLearningService } = require("./OsLearningService") as {
        getOsLearningService: () => { runLearningLoop(u: string): Promise<{ weights: Record<string, number>; totalSessions: number }> };
      };
      const r = await getOsLearningService().runLearningLoop(userId);
      return { weights: r.weights, totalSessions: r.totalSessions };
    },
    mode() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { isGa4RealModeEnabled } = require("../autonomous/analytics/ga4Adapter") as {
          isGa4RealModeEnabled: () => boolean;
        };
        return isGa4RealModeEnabled() ? "real" : "mock";
      } catch {
        return "mock";
      }
    },
  };
}

const defaultRefreshPort: LearningRefreshPort = {
  async run(opts) {
    let templatesRanked = 0;
    let alerts = 0;
    try {
      const { runRankTemplatesJob } = await import("../autonomous/learning/runRankTemplatesJob");
      const rank = await runRankTemplatesJob({});
      templatesRanked = Array.isArray(rank.ranked_slices) ? rank.ranked_slices.length : Number(rank.ranked_slices ?? 0);
    } catch { /* filesystem/registry unavailable */ }
    try {
      const { runLearningRefreshJob } = await import("../autonomous/learning/runLearningRefreshJob");
      const refresh = await runLearningRefreshJob({ realistic_mock: opts.realisticMock, source: "cron" });
      alerts = refresh.alerts.length;
    } catch { /* refresh side-effects best-effort */ }
    return { templatesRanked, alerts };
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsLearningLoopProdService | null = null;

export function getOsLearningLoopProdService(): OsLearningLoopProdService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    const db = DbClient.getInstance();
    _instance = new OsLearningLoopProdService(db, defaultGa4Port(db), defaultRefreshPort);
  }
  return _instance;
}

export function resetOsLearningLoopProdServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsLearningLoopProdService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly ga4: LearningGa4Port,
    private readonly refresh: LearningRefreshPort,
  ) {}

  periodKey(d: Date = new Date()): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  /** Start (or detect already-completed) run for a period+source. */
  async startRun(
    source: LearningTriggerSource,
    period?: string,
  ): Promise<{ run: LearningRun; skipped: boolean }> {
    const periodKey = period ?? this.periodKey();
    const rows = await this.db.query<RunRow & { was_completed: boolean }>(
      `INSERT INTO os_learning_run_log (period_key, trigger_source, status)
       VALUES ($1, $2, 'running')
       ON CONFLICT (period_key, trigger_source)
       DO UPDATE SET status = CASE
                       WHEN os_learning_run_log.status = 'completed' THEN 'completed'
                       ELSE 'running' END,
                     started_at = CASE
                       WHEN os_learning_run_log.status = 'completed' THEN os_learning_run_log.started_at
                       ELSE NOW() END
       RETURNING *, (status = 'completed') AS was_completed`,
      [periodKey, source],
    );
    const run = rowToRun(rows[0]!);
    return { run, skipped: rows[0]!.was_completed === true };
  }

  async completeRun(id: string, stats: LearningRunStats, metadata?: Record<string, unknown>): Promise<LearningRun> {
    const rows = await this.db.query<RunRow>(
      `UPDATE os_learning_run_log
       SET status = 'completed', ga4_users = $2, sectors_updated = $3,
           templates_ranked = $4, seeds_reranked = $5,
           metadata = metadata || $6::jsonb, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, stats.ga4Users, stats.sectorsUpdated, stats.templatesRanked, stats.seedsReranked, JSON.stringify(metadata ?? {})],
    );
    if (!rows[0]) throw new OsLearningLoopError("NOT_FOUND", `Run ${id} no encontrado`);
    return rowToRun(rows[0]);
  }

  async failRun(id: string, error: string): Promise<LearningRun> {
    const rows = await this.db.query<RunRow>(
      `UPDATE os_learning_run_log
       SET status = 'failed', error_message = $2, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, error],
    );
    if (!rows[0]) throw new OsLearningLoopError("NOT_FOUND", `Run ${id} no encontrado`);
    return rowToRun(rows[0]);
  }

  private async markSkipped(id: string, reason: string): Promise<void> {
    await this.db.query(
      `UPDATE os_learning_run_log SET status = 'skipped', metadata = metadata || $2::jsonb, completed_at = NOW()
       WHERE id = $1 AND status <> 'completed'`,
      [id, JSON.stringify({ reason })],
    );
  }

  async listRuns(filters: LearningRunFilters = {}): Promise<LearningRun[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.periodKey) { conditions.push(`period_key = $${idx++}`); params.push(filters.periodKey); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
    const rows = await this.db.query<RunRow>(
      `SELECT * FROM os_learning_run_log ${where} ORDER BY started_at DESC LIMIT $${idx}`,
      [...params, limit],
    );
    return rows.map(rowToRun);
  }

  async getSummary(): Promise<LearningRunSummary> {
    const rows = await this.db.query<{ status: LearningRunStatus; count: string; avg_sectors: string | null }>(
      `SELECT status, COUNT(*) AS count, AVG(sectors_updated) AS avg_sectors
       FROM os_learning_run_log
       WHERE started_at >= NOW() - INTERVAL '30 days'
       GROUP BY status`,
    );
    const summary: LearningRunSummary = { total: 0, completed: 0, failed: 0, skipped: 0, avgSectorsUpdated: 0 };
    let weighted = 0;
    for (const r of rows) {
      const n = parseInt(r.count, 10);
      summary.total += n;
      if (r.status === "completed") summary.completed += n;
      if (r.status === "failed") summary.failed += n;
      if (r.status === "skipped") summary.skipped += n;
      weighted += (parseFloat(r.avg_sectors ?? "0") || 0) * n;
    }
    summary.avgSectorsUpdated = summary.total > 0 ? Math.round(weighted / summary.total) : 0;
    return summary;
  }

  /**
   * Persist GA4-derived learning ranks onto the envato seed registry.
   * Per sector with a CVR weight: rank existing seeds 1..n and set learning_score=CVR.
   */
  async applySeedReranks(weights: Record<string, number>): Promise<number> {
    let reranked = 0;
    for (const [sector, cvr] of Object.entries(weights)) {
      let seedIds: string[] = [];
      try {
        const rows = await this.db.query<{ id: string }>(
          `SELECT id FROM os_envato_seed_registry WHERE sector = $1 ORDER BY id ASC`,
          [sector],
        );
        seedIds = rows.map((r) => r.id);
      } catch {
        continue;
      }
      let rank = 1;
      for (const id of seedIds) {
        try {
          await this.db.query(
            `UPDATE os_envato_seed_registry
             SET learning_rank = $2, learning_score = $3, updated_at = NOW()
             WHERE id = $1`,
            [id, rank, Math.round(cvr * 10000) / 10000],
          );
          rank++;
          reranked++;
        } catch { /* skip individual failures */ }
      }
    }
    return reranked;
  }

  /** Main production orchestrator — best-effort per step, never throws globally. */
  async runProdLoop(opts: { source?: LearningTriggerSource; period?: string; realisticMock?: boolean } = {}): Promise<RunProdLoopResult> {
    const source = opts.source ?? "cron";
    const periodKey = opts.period ?? this.periodKey();
    const partialErrors: string[] = [];
    const stats: LearningRunStats = { ga4Users: 0, sectorsUpdated: 0, templatesRanked: 0, seedsReranked: 0 };

    const { run, skipped } = await this.startRun(source, periodKey);
    if (skipped) {
      return { runId: run.id, periodKey, status: "completed", skipped: true, stats, partialErrors };
    }

    // Step 1 — GA4 per active integration
    let userIds: string[] = [];
    try {
      userIds = await this.ga4.listActiveGa4UserIds();
    } catch (e) {
      partialErrors.push(`ga4-list: ${e instanceof Error ? e.message : String(e)}`);
    }
    stats.ga4Users = userIds.length;

    if (userIds.length === 0) {
      await this.markSkipped(run.id, "no_ga4");
      return { runId: run.id, periodKey, status: "skipped", skipped: true, stats, partialErrors };
    }

    const mergedWeights: Record<string, number> = {};
    for (const userId of userIds) {
      try {
        const { weights } = await this.ga4.runForUser(userId);
        for (const [sector, cvr] of Object.entries(weights)) {
          mergedWeights[sector] = Math.max(mergedWeights[sector] ?? 0, cvr);
        }
      } catch (e) {
        partialErrors.push(`ga4-user ${userId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    stats.sectorsUpdated = Object.keys(mergedWeights).length;

    // Step 2 — template re-rank (M/N/P)
    try {
      const refresh = await this.refresh.run({ realisticMock: opts.realisticMock ?? this.ga4.mode() !== "real" });
      stats.templatesRanked = refresh.templatesRanked;
    } catch (e) {
      partialErrors.push(`refresh: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Step 3 — seed re-ranks
    try {
      stats.seedsReranked = await this.applySeedReranks(mergedWeights);
    } catch (e) {
      partialErrors.push(`seed-rerank: ${e instanceof Error ? e.message : String(e)}`);
    }

    await this.completeRun(run.id, stats, { partial_errors: partialErrors, ga4_mode: this.ga4.mode() });
    return { runId: run.id, periodKey, status: "completed", skipped: false, stats, partialErrors };
  }

  ga4Mode(): "real" | "mock" | "none" {
    return this.ga4.mode();
  }

  async ga4ActiveCount(): Promise<number> {
    try {
      return (await this.ga4.listActiveGa4UserIds()).length;
    } catch {
      return 0;
    }
  }
}
