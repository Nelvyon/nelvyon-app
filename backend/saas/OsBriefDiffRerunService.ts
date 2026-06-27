/**
 * O29 — OsBriefDiffRerunService
 * Compares intake before/after a completed pack run, persists a structured diff,
 * and re-executes the pack (new pack_run) linked to the source — no operator.
 *
 * Standalone + injectable ports so vitest never hits live runners; prod lazy DB.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Constants ───────────────────────────────────────────────────────────────────

export const MATERIAL_INTAKE_FIELDS = [
  "business_name",
  "sector",
  "value_proposition",
  "primary_cta",
  "city",
  "website_url",
  "tier",
] as const;

export type BriefDiffStatus =
  | "pending"
  | "compared"
  | "no_change"
  | "rerunning"
  | "completed"
  | "failed";

export type BriefDiffChangeKind = "changed" | "added" | "removed";

export type BriefDiffChange = {
  field: string;
  before: unknown;
  after: unknown;
  kind: BriefDiffChangeKind;
};

export type BriefDiffRecord = {
  id: string;
  sourcePackRunId: string;
  newPackRunId: string | null;
  packId: string;
  tenantId: string | null;
  workspaceId: number | null;
  beforeIntake: Record<string, unknown>;
  afterIntake: Record<string, unknown>;
  diff: BriefDiffChange[];
  changeCount: number;
  material: boolean;
  status: BriefDiffStatus;
  errorMessage: string | null;
  requestedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  rerunStartedAt: string | null;
  completedAt: string | null;
};

export type BriefDiffSummary = {
  total: number;
  material: number;
  noChange: number;
  completed: number;
  failed: number;
  lastDiffAt: string | null;
};

export type DiffPackRun = {
  id: string;
  packId: string;
  workspaceId: number;
  userId: string;
  intake: Record<string, unknown>;
  status: string;
};

export type DiffPackRunPort = {
  getPackRun(id: string): Promise<DiffPackRun | null>;
};

export type DiffRunnerPort = {
  validate(packId: string, body: unknown): unknown | null;
  run(params: {
    workspaceId: number;
    userId: string;
    intake: unknown;
    packId: string;
  }): Promise<{ id: string }>;
};

export type OsBriefDiffErrorCode = "NOT_FOUND" | "NO_CHANGE" | "VALIDATION" | "RUNNER_ERROR";

export class OsBriefDiffError extends Error {
  constructor(
    public readonly code: OsBriefDiffErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OsBriefDiffError";
  }
}

// ── Pure helpers ────────────────────────────────────────────────────────────────

export function normalizeIntakeValue(v: unknown): unknown {
  if (typeof v === "string") return v.trim();
  return v;
}

export function mergeIntake(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    merged[k] = normalizeIntakeValue(v);
  }
  return merged;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diffIntake(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields?: string[],
): BriefDiffChange[] {
  const keys = fields ?? Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  const changes: BriefDiffChange[] = [];
  for (const field of keys) {
    const b = before[field];
    const a = after[field];
    const hasB = field in before;
    const hasA = field in after;
    if (!hasB && hasA) {
      changes.push({ field, before: null, after: a, kind: "added" });
    } else if (hasB && !hasA) {
      changes.push({ field, before: b, after: null, kind: "removed" });
    } else if (!valuesEqual(b, a)) {
      changes.push({ field, before: b, after: a, kind: "changed" });
    }
  }
  return changes;
}

export function isMaterialDiff(
  changes: BriefDiffChange[],
  materialFields: readonly string[] = MATERIAL_INTAKE_FIELDS,
): boolean {
  const set = new Set(materialFields);
  return changes.some((c) => set.has(c.field));
}

// ── Row mapping ─────────────────────────────────────────────────────────────────

type DiffRow = {
  id: string;
  source_pack_run_id: string;
  new_pack_run_id: string | null;
  pack_id: string;
  tenant_id: string | null;
  workspace_id: number | null;
  before_intake: Record<string, unknown>;
  after_intake: Record<string, unknown>;
  diff: BriefDiffChange[];
  change_count: number;
  material: boolean;
  status: BriefDiffStatus;
  error_message: string | null;
  requested_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  rerun_started_at: string | null;
  completed_at: string | null;
};

function rowToDiff(r: DiffRow): BriefDiffRecord {
  return {
    id: r.id,
    sourcePackRunId: r.source_pack_run_id,
    newPackRunId: r.new_pack_run_id,
    packId: r.pack_id,
    tenantId: r.tenant_id,
    workspaceId: r.workspace_id,
    beforeIntake: r.before_intake ?? {},
    afterIntake: r.after_intake ?? {},
    diff: Array.isArray(r.diff) ? r.diff : [],
    changeCount: r.change_count,
    material: r.material,
    status: r.status,
    errorMessage: r.error_message,
    requestedBy: r.requested_by,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
    rerunStartedAt: r.rerun_started_at,
    completedAt: r.completed_at,
  };
}

// ── Singleton ───────────────────────────────────────────────────────────────────

let _instance: OsBriefDiffRerunService | null = null;

export function getOsBriefDiffRerunService(): OsBriefDiffRerunService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new OsBriefDiffRerunService(DbClient.getInstance());
  }
  return _instance;
}

export function resetOsBriefDiffRerunServiceForTests(): void {
  _instance = null;
}

// ── Service ─────────────────────────────────────────────────────────────────────

export class OsBriefDiffRerunService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly packRunPort?: DiffPackRunPort,
  ) {}

  private async loadPackRun(id: string): Promise<DiffPackRun | null> {
    if (this.packRunPort) return this.packRunPort.getPackRun(id);
    const rows = await this.db.query<{
      id: string;
      pack_id: string;
      workspace_id: number;
      user_id: string;
      intake: Record<string, unknown>;
      status: string;
    }>(
      `SELECT id, pack_id, workspace_id, user_id, intake, status
       FROM nelvyon_pack_runs WHERE id = $1::uuid LIMIT 1`,
      [id],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      packId: r.pack_id,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      intake: r.intake ?? {},
      status: r.status,
    };
  }

  async compare(input: {
    sourcePackRunId: string;
    newIntake: Record<string, unknown>;
    requestedBy?: string;
    workspaceId?: number;
    tenantId?: string;
  }): Promise<BriefDiffRecord> {
    const source = await this.loadPackRun(input.sourcePackRunId);
    if (!source) {
      throw new OsBriefDiffError("NOT_FOUND", `Pack run ${input.sourcePackRunId} no encontrado`);
    }

    const beforeIntake = source.intake;
    const afterIntake = mergeIntake(beforeIntake, input.newIntake);
    const changes = diffIntake(beforeIntake, afterIntake);
    const changeCount = changes.length;
    const material = isMaterialDiff(changes);
    const status: BriefDiffStatus = changeCount === 0 ? "no_change" : "compared";

    const rows = await this.db.query<DiffRow>(
      `INSERT INTO os_brief_diff_runs
         (source_pack_run_id, pack_id, tenant_id, workspace_id, before_intake, after_intake,
          diff, change_count, material, status, requested_by, metadata)
       VALUES ($1::uuid,$2,$3::uuid,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12::jsonb)
       RETURNING *`,
      [
        input.sourcePackRunId,
        source.packId,
        input.tenantId ?? null,
        input.workspaceId ?? source.workspaceId,
        JSON.stringify(beforeIntake),
        JSON.stringify(afterIntake),
        JSON.stringify(changes),
        changeCount,
        material,
        status,
        input.requestedBy ?? null,
        JSON.stringify({ sourceStatus: source.status }),
      ],
    );
    return rowToDiff(rows[0]!);
  }

  async executeRerun(
    diffId: string,
    ctx: { userId: string; workspaceId?: number; runner: DiffRunnerPort },
  ): Promise<{ diff: BriefDiffRecord; newPackRunId: string }> {
    const diff = await this.getDiff(diffId);
    if (!diff) {
      throw new OsBriefDiffError("NOT_FOUND", `Diff ${diffId} no encontrado`);
    }
    if (diff.status === "no_change" || diff.changeCount === 0) {
      throw new OsBriefDiffError("NO_CHANGE", "Sin cambios — no se re-ejecuta el pack");
    }

    const workspaceId = ctx.workspaceId ?? diff.workspaceId;
    if (!workspaceId) {
      throw new OsBriefDiffError("VALIDATION", "workspace_id requerido para re-run");
    }

    await this.db.query(
      `UPDATE os_brief_diff_runs SET status = 'rerunning', rerun_started_at = NOW() WHERE id = $1::uuid`,
      [diffId],
    );

    try {
      const validated = ctx.runner.validate(diff.packId, diff.afterIntake);
      if (!validated) {
        throw new OsBriefDiffError("VALIDATION", `Brief inválido para pack ${diff.packId}`);
      }
      const run = await ctx.runner.run({
        workspaceId,
        userId: ctx.userId,
        intake: validated,
        packId: diff.packId,
      });

      const rows = await this.db.query<DiffRow>(
        `UPDATE os_brief_diff_runs
         SET status = 'completed', new_pack_run_id = $2::uuid, completed_at = NOW(),
             metadata = metadata || $3::jsonb
         WHERE id = $1::uuid
         RETURNING *`,
        [diffId, run.id, JSON.stringify({ parent_pack_run_id: diff.sourcePackRunId })],
      );
      return { diff: rowToDiff(rows[0]!), newPackRunId: run.id };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Runner error";
      const rows = await this.db.query<DiffRow>(
        `UPDATE os_brief_diff_runs
         SET status = 'failed', error_message = $2, completed_at = NOW()
         WHERE id = $1::uuid
         RETURNING *`,
        [diffId, message],
      );
      if (e instanceof OsBriefDiffError) throw e;
      throw new OsBriefDiffError("RUNNER_ERROR", message);
    }
  }

  async compareAndRerun(
    input: {
      sourcePackRunId: string;
      newIntake: Record<string, unknown>;
      requestedBy?: string;
      workspaceId?: number;
      tenantId?: string;
      execute?: boolean;
    },
    ctx: { userId: string; runner: DiffRunnerPort },
  ): Promise<{ diff: BriefDiffRecord; newPackRunId?: string }> {
    const diff = await this.compare(input);
    if (input.execute === false || diff.status === "no_change") {
      return { diff };
    }
    const { newPackRunId } = await this.executeRerun(diff.id, {
      userId: ctx.userId,
      workspaceId: input.workspaceId,
      runner: ctx.runner,
    });
    const updated = await this.getDiff(diff.id);
    return { diff: updated ?? diff, newPackRunId };
  }

  async getDiff(id: string): Promise<BriefDiffRecord | null> {
    const rows = await this.db.query<DiffRow>(
      `SELECT * FROM os_brief_diff_runs WHERE id = $1::uuid LIMIT 1`,
      [id],
    );
    return rows[0] ? rowToDiff(rows[0]) : null;
  }

  async listDiffs(filters: {
    sourcePackRunId?: string;
    status?: BriefDiffStatus;
    limit?: number;
  } = {}): Promise<BriefDiffRecord[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (filters.sourcePackRunId) {
      clauses.push(`source_pack_run_id = $${i++}::uuid`);
      params.push(filters.sourcePackRunId);
    }
    if (filters.status) {
      clauses.push(`status = $${i++}`);
      params.push(filters.status);
    }
    const limit = filters.limit ?? 100;
    params.push(limit);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.db.query<DiffRow>(
      `SELECT * FROM os_brief_diff_runs ${where} ORDER BY created_at DESC LIMIT $${i}`,
      params,
    );
    return rows.map(rowToDiff);
  }

  async getSummary(): Promise<BriefDiffSummary> {
    const rows = await this.db.query<{
      total: string;
      material: string;
      no_change: string;
      completed: string;
      failed: string;
      last_diff_at: string | null;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE material = true)::text AS material,
         COUNT(*) FILTER (WHERE status = 'no_change')::text AS no_change,
         COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
         COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
         MAX(created_at) AS last_diff_at
       FROM os_brief_diff_runs`,
    );
    const r = rows[0];
    return {
      total: Number(r?.total ?? 0),
      material: Number(r?.material ?? 0),
      noChange: Number(r?.no_change ?? 0),
      completed: Number(r?.completed ?? 0),
      failed: Number(r?.failed ?? 0),
      lastDiffAt: r?.last_diff_at ?? null,
    };
  }
}
