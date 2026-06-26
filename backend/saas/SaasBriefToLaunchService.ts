/**
 * S49 — SaasBriefToLaunchService
 * Unified "brief → launch OS pack → progress → portal" flow from SaaS context.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LaunchStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type PackLaunch = {
  id: string;
  tenantId: string;
  packId: string;
  packRunId: string | null;
  brief: Record<string, unknown>;
  status: LaunchStatus;
  progressPct: number;
  errorMessage: string | null;
  portalUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type LaunchStep = {
  key: string;
  label: string;
  status: string;
  detail?: string;
  at?: string;
};

export type LaunchStatusDetail = PackLaunch & {
  steps: LaunchStep[];
  qaScore: number | null;
  reportUrl: string | null;
};

export type AvailablePackDef = {
  id: string;
  name: string;
  tagline: string;
  availability: string;
  estimatedMinutes: number;
  inputs: string[];
  outputs: string[];
  accent: string;
};

export type CreateLaunchInput = {
  packId: string;
  brief: Record<string, unknown>;
  userId?: string;
};

export type SaasBriefToLaunchErrorCode =
  | "NOT_FOUND"
  | "VALIDATION"
  | "NO_WORKSPACE"
  | "PACK_NOT_AVAILABLE"
  | "RUNNER_ERROR";

export class SaasBriefToLaunchError extends Error {
  constructor(
    public readonly code: SaasBriefToLaunchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SaasBriefToLaunchError";
  }
}

// ── Row types ─────────────────────────────────────────────────────────────────

type LaunchRow = {
  id: string;
  tenant_id: string;
  pack_id: string;
  pack_run_id: string | null;
  brief: Record<string, unknown>;
  status: LaunchStatus;
  progress_pct: number;
  error_message: string | null;
  portal_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type PackRunRow = {
  id: string;
  status: string;
  steps: LaunchStep[] | null;
  report: { qaScore?: number; reportUrl?: string } | null;
  workspace_id: number;
};

function rowToLaunch(r: LaunchRow): PackLaunch {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    packId: r.pack_id,
    packRunId: r.pack_run_id,
    brief: r.brief,
    status: r.status,
    progressPct: r.progress_pct,
    errorMessage: r.error_message,
    portalUrl: r.portal_url,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at,
  };
}

// ── Runner port ───────────────────────────────────────────────────────────────

export type PackRunnerPort = {
  getRunner(packId: string): {
    run(p: { workspaceId: number; userId: string; intake: unknown }): Promise<{ id: string }>;
  } | undefined;
};

/** S52 — pack entitlement gating, injected to keep this service test-friendly. */
export type EntitlementPort = {
  canLaunch(tenantId: string, packId: string): Promise<{ allowed: boolean; reason?: string }>;
  consumeLaunch(tenantId: string, packId: string): Promise<void>;
};

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: SaasBriefToLaunchService | null = null;

export function getSaasBriefToLaunchService(): SaasBriefToLaunchService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    // Lazy-load RUNNERS to avoid pulling in Next.js deps at module init
    const runners: PackRunnerPort = {
      getRunner(packId: string) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { RUNNERS } = require("../../apps/web/src/app/api/os/packs/[packId]/kickoff/runnersMap") as {
          RUNNERS: Record<string, { run: (p: { workspaceId: number; userId: string; intake: unknown }) => Promise<{ id: string }> }>;
        };
        return RUNNERS[packId];
      },
    };
    // S52 — entitlement gating via the pack store service
    const entitlements: EntitlementPort = {
      async canLaunch(tenantId, packId) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSaasPackStoreService } = require("./SaasPackStoreService") as {
          getSaasPackStoreService: () => EntitlementPort;
        };
        return getSaasPackStoreService().canLaunch(tenantId, packId);
      },
      async consumeLaunch(tenantId, packId) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSaasPackStoreService } = require("./SaasPackStoreService") as {
          getSaasPackStoreService: () => EntitlementPort;
        };
        return getSaasPackStoreService().consumeLaunch(tenantId, packId);
      },
    };
    _instance = new SaasBriefToLaunchService(DbClient.getInstance(), runners, entitlements);
  }
  return _instance;
}

export function resetSaasBriefToLaunchServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasBriefToLaunchService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly runners?: PackRunnerPort,
    private readonly entitlements?: EntitlementPort,
  ) {}

  /** Returns packs visible in the brief-to-launch UI (no coming_soon). */
  async listAvailablePacks(_tenantId: string): Promise<AvailablePackDef[]> {
    // Import catalog synchronously — it's a pure static file
    const { SERVICE_PACK_CATALOG } = await import(
      "../../apps/web/src/lib/saas/servicePacksCatalog"
    );
    return (SERVICE_PACK_CATALOG as AvailablePackDef[]).filter(
      (p) => (p as { availability: string }).availability !== "coming_soon",
    );
  }

  /** Creates a queued launch row. Does NOT execute the pack — call executeLaunch separately. */
  async createLaunch(
    tenantId: string,
    input: CreateLaunchInput,
  ): Promise<PackLaunch> {
    const { packId, brief, userId } = input;
    if (!packId?.trim()) {
      throw new SaasBriefToLaunchError("VALIDATION", "packId requerido");
    }
    // S52 — gate on pack entitlement when the port is wired (production singleton)
    if (this.entitlements) {
      const check = await this.entitlements.canLaunch(tenantId, packId);
      if (!check.allowed) {
        throw new SaasBriefToLaunchError(
          "VALIDATION",
          check.reason === "QUOTA_EXHAUSTED"
            ? "Has agotado los lanzamientos disponibles de este pack"
            : "No tienes acceso a este pack — adquiérelo en el Pack Store",
        );
      }
    }
    const rows = await this.db.query<LaunchRow>(
      `INSERT INTO saas_pack_launches
         (tenant_id, pack_id, brief, status, progress_pct, created_by)
       VALUES ($1, $2, $3::jsonb, 'queued', 0, $4)
       RETURNING *`,
      [tenantId, packId, JSON.stringify(brief), userId ?? null],
    );
    return rowToLaunch(rows[0]!);
  }

  /**
   * Executes an existing queued launch:
   *  1. Resolves workspace_id from saas_tenants
   *  2. Runs the pack via the RUNNERS map (same as kickoff route, no HTTP)
   *  3. Updates launch with pack_run_id + status
   */
  async executeLaunch(tenantId: string, launchId: string): Promise<PackLaunch> {
    const launchRows = await this.db.query<LaunchRow>(
      `SELECT * FROM saas_pack_launches WHERE id=$1 AND tenant_id=$2`,
      [launchId, tenantId],
    );
    const launch = launchRows[0];
    if (!launch) {
      throw new SaasBriefToLaunchError("NOT_FOUND", `Launch ${launchId} no encontrado`);
    }

    // Resolve workspace_id
    const tenantRows = await this.db.query<{ workspace_id: number | null }>(
      `SELECT workspace_id FROM saas_tenants WHERE tenant_id=$1`,
      [tenantId],
    );
    const workspaceId = tenantRows[0]?.workspace_id ?? null;
    if (!workspaceId) {
      await this.db.query(
        `UPDATE saas_pack_launches
         SET status='failed', error_message=$1, updated_at=NOW()
         WHERE id=$2`,
        ["workspace_id no configurado — contacta con soporte", launchId],
      );
      throw new SaasBriefToLaunchError("NO_WORKSPACE", "Tenant sin workspace_id");
    }

    // Mark as running
    await this.db.query(
      `UPDATE saas_pack_launches
       SET status='running', updated_at=NOW()
       WHERE id=$1`,
      [launchId],
    );

    try {
      // Resolve runner via injected port (testable) or lazy require (production)
      const runnersPort = this.runners ?? {
        getRunner(packId: string) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { RUNNERS } = require("../../apps/web/src/app/api/os/packs/[packId]/kickoff/runnersMap") as {
            RUNNERS: Record<string, { run: (p: { workspaceId: number; userId: string; intake: unknown }) => Promise<{ id: string }> }>;
          };
          return RUNNERS[packId];
        },
      };
      const runner = runnersPort.getRunner(launch.pack_id);
      if (!runner) {
        throw new SaasBriefToLaunchError(
          "PACK_NOT_AVAILABLE",
          `Sin runner para pack: ${launch.pack_id}`,
        );
      }

      const packRun = await runner.run({
        workspaceId,
        userId: launch.created_by ?? tenantId,
        intake: launch.brief as never,
      });

      // Build portal URL
      const portalUrl = `/portal/deliverables?pack_run_id=${packRun.id}`;

      const updated = await this.db.query<LaunchRow>(
        `UPDATE saas_pack_launches
         SET pack_run_id=$1, status='completed', progress_pct=100,
             portal_url=$2, completed_at=NOW(), updated_at=NOW()
         WHERE id=$3
         RETURNING *`,
        [packRun.id, portalUrl, launchId],
      );

      // Hook S50: sync compliance artifact for the pack run (non-blocking)
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSaasComplianceVaultService } = require("./SaasComplianceVaultService") as {
          getSaasComplianceVaultService: () => { syncFromPackRun(tenantId: string, packRunId: string): Promise<unknown> };
        };
        void getSaasComplianceVaultService().syncFromPackRun(tenantId, packRun.id).catch(() => {});
      } catch { /* never block launch */ }

      // Hook S52: consume a launch from the pack entitlement (non-blocking)
      if (this.entitlements) {
        void this.entitlements.consumeLaunch(tenantId, launch.pack_id).catch(() => {});
      }

      return rowToLaunch(updated[0]!);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.db.query(
        `UPDATE saas_pack_launches
         SET status='failed', error_message=$1, updated_at=NOW()
         WHERE id=$2`,
        [msg, launchId],
      );
      throw err;
    }
  }

  /** Returns launch with steps and QA from the linked pack run. */
  async getLaunchStatus(tenantId: string, launchId: string): Promise<LaunchStatusDetail> {
    const launchRows = await this.db.query<LaunchRow>(
      `SELECT * FROM saas_pack_launches WHERE id=$1 AND tenant_id=$2`,
      [launchId, tenantId],
    );
    const launch = launchRows[0];
    if (!launch) {
      throw new SaasBriefToLaunchError("NOT_FOUND", `Launch ${launchId} no encontrado`);
    }

    let steps: LaunchStep[] = [];
    let qaScore: number | null = null;
    let reportUrl: string | null = null;

    if (launch.pack_run_id) {
      const runRows = await this.db.query<PackRunRow>(
        `SELECT id, status, steps, report, workspace_id
         FROM nelvyon_pack_runs WHERE id=$1`,
        [launch.pack_run_id],
      );
      const run = runRows[0];
      if (run) {
        steps = Array.isArray(run.steps) ? run.steps : [];
        qaScore = (run.report as { qaScore?: number } | null)?.qaScore ?? null;
        reportUrl = (run.report as { reportUrl?: string } | null)?.reportUrl ?? null;
      }
    }

    return { ...rowToLaunch(launch), steps, qaScore, reportUrl };
  }

  /** Lists recent launches for the tenant. */
  async listLaunches(tenantId: string, limit = 20): Promise<PackLaunch[]> {
    const rows = await this.db.query<LaunchRow>(
      `SELECT * FROM saas_pack_launches
       WHERE tenant_id=$1
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, String(limit)],
    );
    return rows.map(rowToLaunch);
  }

  /** Syncs progress_pct from a linked pack run's steps. */
  async syncLaunchFromPackRun(packRunId: string): Promise<void> {
    const runRows = await this.db.query<{ steps: LaunchStep[] | null; status: string }>(
      `SELECT steps, status FROM nelvyon_pack_runs WHERE id=$1`,
      [packRunId],
    );
    const run = runRows[0];
    if (!run) return;

    const steps = Array.isArray(run.steps) ? run.steps : [];
    const done = steps.filter((s) => s.status === "done").length;
    const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;
    const status: LaunchStatus =
      run.status === "completed"
        ? "completed"
        : run.status === "failed"
        ? "failed"
        : "running";

    await this.db.query(
      `UPDATE saas_pack_launches
       SET progress_pct=$1, status=$2, updated_at=NOW()
       WHERE pack_run_id=$3`,
      [String(pct), status, packRunId],
    );
  }
}
