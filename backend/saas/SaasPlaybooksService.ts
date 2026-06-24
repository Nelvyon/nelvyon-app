import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import type { DealStage } from "./saasDealsDedupe";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PlaybookActionType = "task" | "email" | "call" | "note" | "wait";

export interface PlaybookAction {
  id: string;
  playbookId: string;
  tenantId: string;
  sortOrder: number;
  actionType: PlaybookActionType;
  title: string;
  description: string | null;
  template: string | null;
  waitDays: number | null;
  createdAt: string;
}

export interface Playbook {
  id: string;
  tenantId: string;
  name: string;
  stage: DealStage;
  description: string | null;
  active: boolean;
  actions: PlaybookAction[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlaybookInput {
  name: string;
  stage: DealStage;
  description?: string;
  actions?: Array<{
    actionType: PlaybookActionType;
    title: string;
    description?: string;
    template?: string;
    waitDays?: number;
  }>;
}

export interface StageProbability {
  stage: DealStage;
  probability: number;
}

export class SaasPlaybooksError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION") {
    super(message);
    this.name = "SaasPlaybooksError";
  }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function rowToAction(r: Record<string, unknown>): PlaybookAction {
  return {
    id: String(r.id),
    playbookId: String(r.playbookId ?? r.playbook_id),
    tenantId: String(r.tenantId ?? r.tenant_id),
    sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
    actionType: String(r.actionType ?? r.action_type) as PlaybookActionType,
    title: String(r.title),
    description: r.description != null ? String(r.description) : null,
    template: r.template != null ? String(r.template) : null,
    waitDays: r.waitDays != null ? Number(r.waitDays) : r.wait_days != null ? Number(r.wait_days) : null,
    createdAt: String(r.createdAt ?? r.created_at),
  };
}

function rowToPlaybook(r: Record<string, unknown>, actions: PlaybookAction[]): Playbook {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId ?? r.tenant_id),
    name: String(r.name),
    stage: String(r.stage) as DealStage,
    description: r.description != null ? String(r.description) : null,
    active: Boolean(r.active),
    actions,
    createdAt: String(r.createdAt ?? r.created_at),
    updatedAt: String(r.updatedAt ?? r.updated_at),
  };
}

// ── Default stage probabilities ───────────────────────────────────────────────

export const DEFAULT_STAGE_PROBS: Record<DealStage, number> = {
  new:       10,
  contacted: 25,
  qualified: 50,
  proposal:  75,
  won:       100,
  lost:      0,
};

// ── Service ────────────────────────────────────────────────────────────────────

export class SaasPlaybooksService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Stage probabilities ───────────────────────────────────────────────────

  async getStageProbabilities(tenantId: string): Promise<Record<DealStage, number>> {
    const rows = await this.db.query<{ stage: string; probability: string }>(
      `SELECT stage, probability FROM saas_stage_probabilities WHERE tenant_id = $1`,
      [tenantId],
    );
    const result = { ...DEFAULT_STAGE_PROBS };
    for (const r of rows) {
      result[r.stage as DealStage] = Number(r.probability);
    }
    return result;
  }

  async upsertStageProbability(tenantId: string, stage: DealStage, probability: number): Promise<void> {
    if (probability < 0 || probability > 100) {
      throw new SaasPlaybooksError("probability must be 0-100", "VALIDATION");
    }
    await this.db.query(
      `INSERT INTO saas_stage_probabilities (tenant_id, stage, probability)
       VALUES ($1,$2,$3)
       ON CONFLICT (tenant_id, stage) DO UPDATE SET probability = EXCLUDED.probability`,
      [tenantId, stage, probability],
    );
  }

  // ── Playbooks CRUD ────────────────────────────────────────────────────────

  async list(tenantId: string, stage?: DealStage): Promise<Playbook[]> {
    const base = `SELECT id, tenant_id AS "tenantId", name, stage, description, active,
       created_at AS "createdAt", updated_at AS "updatedAt"
     FROM saas_playbooks WHERE tenant_id = $1`;
    const rows = stage
      ? await this.db.query<Record<string, unknown>>(base + ` AND stage = $2 ORDER BY created_at`, [tenantId, stage])
      : await this.db.query<Record<string, unknown>>(base + ` ORDER BY stage, created_at`, [tenantId]);

    if (rows.length === 0) return [];

    const ids = rows.map(r => String(r.id));
    const actRows = await this.db.query<Record<string, unknown>>(
      `SELECT id, playbook_id AS "playbookId", tenant_id AS "tenantId", sort_order AS "sortOrder",
              action_type AS "actionType", title, description, template, wait_days AS "waitDays",
              created_at AS "createdAt"
       FROM saas_playbook_actions WHERE playbook_id = ANY($1::uuid[]) ORDER BY playbook_id, sort_order`,
      [ids],
    );
    const actionMap = new Map<string, PlaybookAction[]>();
    for (const a of actRows) {
      const pbId = String(a.playbookId);
      const list = actionMap.get(pbId) ?? [];
      list.push(rowToAction(a));
      actionMap.set(pbId, list);
    }
    return rows.map(r => rowToPlaybook(r, actionMap.get(String(r.id)) ?? []));
  }

  async get(tenantId: string, id: string): Promise<Playbook> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, tenant_id AS "tenantId", name, stage, description, active,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM saas_playbooks WHERE id = $1::uuid AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasPlaybooksError("Playbook no encontrado", "NOT_FOUND");
    const actRows = await this.db.query<Record<string, unknown>>(
      `SELECT id, playbook_id AS "playbookId", tenant_id AS "tenantId", sort_order AS "sortOrder",
              action_type AS "actionType", title, description, template, wait_days AS "waitDays",
              created_at AS "createdAt"
       FROM saas_playbook_actions WHERE playbook_id = $1::uuid ORDER BY sort_order`,
      [id],
    );
    return rowToPlaybook(rows[0], actRows.map(rowToAction));
  }

  async create(tenantId: string, input: CreatePlaybookInput): Promise<Playbook> {
    if (!input.name?.trim()) throw new SaasPlaybooksError("name es obligatorio", "VALIDATION");
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_playbooks (tenant_id, name, stage, description)
       VALUES ($1,$2,$3,$4)
       RETURNING id, tenant_id AS "tenantId", name, stage, description, active,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [tenantId, input.name.trim(), input.stage, input.description ?? null],
    );
    const pb = rows[0];
    if (!pb) throw new Error("INSERT playbook returned no row");

    const actions: PlaybookAction[] = [];
    if (input.actions?.length) {
      for (let i = 0; i < input.actions.length; i++) {
        const a = input.actions[i]!;
        const aRows = await this.db.query<Record<string, unknown>>(
          `INSERT INTO saas_playbook_actions (playbook_id, tenant_id, sort_order, action_type, title, description, template, wait_days)
           VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, playbook_id AS "playbookId", tenant_id AS "tenantId", sort_order AS "sortOrder",
                     action_type AS "actionType", title, description, template, wait_days AS "waitDays", created_at AS "createdAt"`,
          [String(pb.id), tenantId, i, a.actionType, a.title.trim(), a.description ?? null, a.template ?? null, a.waitDays ?? null],
        );
        if (aRows[0]) actions.push(rowToAction(aRows[0]));
      }
    }
    return rowToPlaybook(pb, actions);
  }

  async update(tenantId: string, id: string, patch: { name?: string; description?: string; active?: boolean }): Promise<Playbook> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_playbooks SET
         name        = COALESCE($3, name),
         description = COALESCE($4, description),
         active      = COALESCE($5, active),
         updated_at  = NOW()
       WHERE id = $1::uuid AND tenant_id = $2
       RETURNING id, tenant_id AS "tenantId", name, stage, description, active,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, tenantId, patch.name ?? null, patch.description ?? null, patch.active ?? null],
    );
    if (!rows[0]) throw new SaasPlaybooksError("Playbook no encontrado", "NOT_FOUND");
    return this.get(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_playbooks WHERE id = $1::uuid AND tenant_id = $2 RETURNING id`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasPlaybooksError("Playbook no encontrado", "NOT_FOUND");
  }

  // ── Forecast (weighted pipeline) ──────────────────────────────────────────

  async getForecast(tenantId: string): Promise<{
    weightedTotal: number;
    bestCase: number;
    committed: number;
    byStage: Array<{ stage: DealStage; count: number; value: number; weightedValue: number; probability: number }>;
  }> {
    const probs = await this.getStageProbabilities(tenantId);
    const rows = await this.db.query<{ stage: string; cnt: string; total: string }>(
      `SELECT stage, COUNT(*)::text AS cnt, COALESCE(SUM(value),0)::text AS total
       FROM saas_deals
       WHERE tenant_id = $1 AND stage NOT IN ('won','lost')
       GROUP BY stage`,
      [tenantId],
    );

    let weightedTotal = 0;
    let bestCase = 0;
    let committed = 0;

    const byStage = rows.map(r => {
      const stage = r.stage as DealStage;
      const count = Number(r.cnt);
      const value = Number(r.total);
      const probability = probs[stage] ?? DEFAULT_STAGE_PROBS[stage] ?? 0;
      const weightedValue = Math.round(value * probability) / 100;
      weightedTotal += weightedValue;
      bestCase += value;
      if (probability >= 75) committed += value;
      return { stage, count, value, weightedValue, probability };
    });

    return { weightedTotal, bestCase, committed, byStage };
  }
}

let _svc: SaasPlaybooksService | undefined;
export function getSaasPlaybooksService(): SaasPlaybooksService {
  _svc ??= new SaasPlaybooksService();
  return _svc;
}
export function resetSaasPlaybooksServiceForTests(): void {
  _svc = undefined;
}
