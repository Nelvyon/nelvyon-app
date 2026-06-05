import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { isOpenDealStage, type DealStage } from "./saasDealsDedupe";
import type { ContactActivity } from "./SaasCrmService";

export interface SaasDeal {
  id: string;
  tenantId: string;
  contactId: string | null;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string | null;
  source: string | null;
  ownerUserId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealFilters {
  stage?: DealStage;
  contact_id?: string;
  search?: string;
  open_only?: boolean;
}

export interface CreateDealInput {
  title: string;
  contact_id?: string | null;
  value?: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expected_close_date?: string | null;
  source?: string | null;
  owner_user_id?: string | null;
  notes?: string | null;
}

export type UpdateDealInput = Partial<CreateDealInput>;

export interface StageMetricsItem {
  stage: DealStage;
  count: number;
  totalValue: number;
  /** % de deals en esta etapa que terminaron en won (histórico simplificado: won / count en etapa). */
  conversionToWonPct: number | null;
}

export interface SaasDealsMetrics {
  openCount: number;
  wonCount: number;
  lostCount: number;
  pipelineValue: number;
  wonValue: number;
  forecastValue: number;
  currency: string;
  byStage: StageMetricsItem[];
}

export interface ContactDealsContext {
  deals: SaasDeal[];
  dealCount: number;
  totalValue: number;
  primaryStage: DealStage | null;
  recentActivities: ContactActivity[];
}

export class SaasDealsError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "CONSTRAINT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasDealsError";
  }
}

const STAGES: readonly DealStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

type DealRow = {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  title: string;
  value: string | number;
  currency: string;
  stage: DealStage;
  probability: number;
  expected_close_date: Date | string | null;
  source: string | null;
  owner_user_id: string | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type MetricsStageRow = {
  stage: DealStage;
  n: string | number;
  total_value: string | number | null;
  won_from_stage: string | number | null;
};

type ActivityRow = {
  id: string;
  contact_id: string;
  tenant_id: string;
  activity_type: string;
  description: string;
  scheduled_at: Date | string | null;
  completed: boolean;
  created_at: Date | string;
};

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function toNumber(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeOptional(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function assertStage(v: string): DealStage {
  if ((STAGES as readonly string[]).includes(v)) return v as DealStage;
  throw new SaasDealsError("Invalid stage", "VALIDATION");
}

function rowToDeal(row: DealRow): SaasDeal {
  const close =
    row.expected_close_date == null
      ? null
      : typeof row.expected_close_date === "string"
        ? row.expected_close_date.slice(0, 10)
        : row.expected_close_date.toISOString().slice(0, 10);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    contactId: row.contact_id,
    title: row.title,
    value: toNumber(row.value),
    currency: row.currency,
    stage: row.stage,
    probability: row.probability,
    expectedCloseDate: close,
    source: row.source,
    ownerUserId: row.owner_user_id,
    notes: row.notes,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToActivity(row: ActivityRow): ContactActivity {
  return {
    id: row.id,
    contactId: row.contact_id,
    tenantId: row.tenant_id,
    activityType: row.activity_type as ContactActivity["activityType"],
    description: row.description,
    scheduledAt: row.scheduled_at == null ? null : toIso(row.scheduled_at),
    completed: row.completed,
    createdAt: toIso(row.created_at),
  };
}

export class SaasDealsService {
  constructor(private readonly db: SaasPostgresPort) {}

  private async assertContactInTenant(tenantId: string, contactId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_contacts WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, contactId],
    );
    if (!rows[0]) {
      throw new SaasDealsError("Contact not found in tenant", "NOT_FOUND");
    }
  }

  async listDeals(tenantId: string, filters?: DealFilters): Promise<SaasDeal[]> {
    const clauses: string[] = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let idx = 2;
    if (filters?.stage) {
      assertStage(filters.stage);
      clauses.push(`stage = $${idx++}`);
      params.push(filters.stage);
    }
    if (filters?.open_only) {
      clauses.push(`stage IN ('new','contacted','qualified','proposal')`);
    }
    if (filters?.contact_id) {
      clauses.push(`contact_id = $${idx++}`);
      params.push(filters.contact_id);
    }
    if (filters?.search?.trim()) {
      clauses.push(`title ILIKE $${idx}`);
      params.push(`%${filters.search.trim()}%`);
      idx += 1;
    }
    const rows = await this.db.query<DealRow>(
      `SELECT id, tenant_id, contact_id, title, value, currency, stage, probability,
              expected_close_date, source, owner_user_id, notes, created_at, updated_at
       FROM saas_deals
       WHERE ${clauses.join(" AND ")}
       ORDER BY updated_at DESC`,
      params,
    );
    return rows.map(rowToDeal);
  }

  async getDeal(tenantId: string, dealId: string): Promise<SaasDeal | null> {
    const rows = await this.db.query<DealRow>(
      `SELECT id, tenant_id, contact_id, title, value, currency, stage, probability,
              expected_close_date, source, owner_user_id, notes, created_at, updated_at
       FROM saas_deals
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1`,
      [tenantId, dealId],
    );
    return rows[0] ? rowToDeal(rows[0]) : null;
  }

  async createDeal(tenantId: string, data: CreateDealInput): Promise<SaasDeal> {
    const title = data.title.trim();
    if (title.length === 0) {
      throw new SaasDealsError("title is required", "VALIDATION");
    }
    const contactId = data.contact_id ?? null;
    if (contactId) await this.assertContactInTenant(tenantId, contactId);
    const stage = data.stage !== undefined ? assertStage(data.stage) : "new";
    const probability =
      data.probability !== undefined
        ? Math.min(100, Math.max(0, Math.round(data.probability)))
        : 10;
    const rows = await this.db.query<DealRow>(
      `INSERT INTO saas_deals
         (tenant_id, contact_id, title, value, currency, stage, probability,
          expected_close_date, source, owner_user_id, notes, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       RETURNING id, tenant_id, contact_id, title, value, currency, stage, probability,
                 expected_close_date, source, owner_user_id, notes, created_at, updated_at`,
      [
        tenantId,
        contactId,
        title,
        data.value ?? 0,
        (data.currency ?? "EUR").trim() || "EUR",
        stage,
        probability,
        data.expected_close_date ?? null,
        normalizeOptional(data.source),
        normalizeOptional(data.owner_user_id),
        normalizeOptional(data.notes),
      ],
    );
    const row = rows[0];
    if (!row) throw new SaasDealsError("Failed to create deal", "CONSTRAINT");
    return rowToDeal(row);
  }

  async updateDeal(tenantId: string, dealId: string, data: UpdateDealInput): Promise<SaasDeal> {
    const existing = await this.getDeal(tenantId, dealId);
    if (!existing) throw new SaasDealsError("Deal not found", "NOT_FOUND");
    if (data.contact_id) await this.assertContactInTenant(tenantId, data.contact_id);
    const stage = data.stage !== undefined ? assertStage(data.stage) : undefined;
    const title = data.title !== undefined ? data.title.trim() : undefined;
    if (title !== undefined && title.length === 0) {
      throw new SaasDealsError("title cannot be empty", "VALIDATION");
    }
    const rows = await this.db.query<DealRow>(
      `UPDATE saas_deals SET
         contact_id = COALESCE($3, contact_id),
         title = COALESCE($4, title),
         value = COALESCE($5, value),
         currency = COALESCE($6, currency),
         stage = COALESCE($7, stage),
         probability = COALESCE($8, probability),
         expected_close_date = COALESCE($9, expected_close_date),
         source = COALESCE($10, source),
         owner_user_id = COALESCE($11, owner_user_id),
         notes = COALESCE($12, notes),
         updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING id, tenant_id, contact_id, title, value, currency, stage, probability,
                 expected_close_date, source, owner_user_id, notes, created_at, updated_at`,
      [
        tenantId,
        dealId,
        data.contact_id === undefined ? null : data.contact_id,
        title ?? null,
        data.value === undefined ? null : data.value,
        data.currency === undefined ? null : data.currency,
        stage ?? null,
        data.probability === undefined ? null : Math.min(100, Math.max(0, Math.round(data.probability))),
        data.expected_close_date === undefined ? null : data.expected_close_date,
        data.source === undefined ? null : normalizeOptional(data.source),
        data.owner_user_id === undefined ? null : normalizeOptional(data.owner_user_id),
        data.notes === undefined ? null : normalizeOptional(data.notes),
      ],
    );
    const row = rows[0];
    if (!row) throw new SaasDealsError("Deal not found", "NOT_FOUND");
    return rowToDeal(row);
  }

  async changeStage(
    tenantId: string,
    dealId: string,
    stage: string,
    probability?: number,
  ): Promise<SaasDeal> {
    const s = assertStage(stage);
    const patch: UpdateDealInput = { stage: s };
    if (probability !== undefined) patch.probability = probability;
    if (s === "won") patch.probability = 100;
    if (s === "lost") patch.probability = 0;
    return this.updateDeal(tenantId, dealId, patch);
  }

  async deleteDeal(tenantId: string, dealId: string): Promise<void> {
    await this.db.query(`DELETE FROM saas_deals WHERE tenant_id = $1 AND id = $2`, [tenantId, dealId]);
  }

  async getMetrics(tenantId: string): Promise<SaasDealsMetrics> {
    const rows = await this.db.query<MetricsStageRow>(
      `SELECT stage,
              COUNT(*)::text AS n,
              COALESCE(SUM(value), 0)::text AS total_value,
              COUNT(*) FILTER (WHERE stage = 'won')::text AS won_from_stage
       FROM saas_deals
       WHERE tenant_id = $1
       GROUP BY stage`,
      [tenantId],
    );

    const byStageMap = new Map<DealStage, StageMetricsItem>();
    for (const s of STAGES) {
      byStageMap.set(s, { stage: s, count: 0, totalValue: 0, conversionToWonPct: null });
    }
    for (const r of rows) {
      const count = toNumber(r.n);
      byStageMap.set(r.stage, {
        stage: r.stage,
        count,
        totalValue: toNumber(r.total_value),
        conversionToWonPct: r.stage === "won" && count > 0 ? 100 : null,
      });
    }

    const all = await this.listDeals(tenantId);
    let openCount = 0;
    let wonCount = 0;
    let lostCount = 0;
    let pipelineValue = 0;
    let wonValue = 0;
    let forecastValue = 0;
    const currency = all[0]?.currency ?? "EUR";

    for (const d of all) {
      if (d.stage === "won") {
        wonCount += 1;
        wonValue += d.value;
      } else if (d.stage === "lost") {
        lostCount += 1;
      } else if (isOpenDealStage(d.stage)) {
        openCount += 1;
        pipelineValue += d.value;
        forecastValue += d.value * (d.probability / 100);
      }
    }

    const total = all.length;
    const wonTotal = wonCount;
    if (total > 0 && wonTotal > 0) {
      for (const item of byStageMap.values()) {
        if (item.count > 0 && item.stage !== "won" && item.stage !== "lost") {
          item.conversionToWonPct = Math.round((wonTotal / total) * 1000) / 10;
        }
      }
    }

    return {
      openCount,
      wonCount,
      lostCount,
      pipelineValue,
      wonValue,
      forecastValue,
      currency,
      byStage: STAGES.map((s) => byStageMap.get(s) as StageMetricsItem),
    };
  }

  async getContactDealsContext(
    tenantId: string,
    contactId: string,
  ): Promise<ContactDealsContext | null> {
    const contactRows = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_contacts WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, contactId],
    );
    if (!contactRows[0]) return null;

    const deals = await this.listDeals(tenantId, { contact_id: contactId });
    const totalValue = deals.reduce((s, d) => s + d.value, 0);
    const openDeals = deals.filter((d) => isOpenDealStage(d.stage));
    const primaryStage =
      openDeals.sort((a, b) => b.value - a.value)[0]?.stage ??
      deals[0]?.stage ??
      null;

    const actRows = await this.db.query<ActivityRow>(
      `SELECT id, contact_id, tenant_id, activity_type, description, scheduled_at, completed, created_at
       FROM saas_contact_activities
       WHERE contact_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC
       LIMIT 10`,
      [contactId, tenantId],
    );

    return {
      deals,
      dealCount: deals.length,
      totalValue,
      primaryStage,
      recentActivities: actRows.map(rowToActivity),
    };
  }
}

let cached: SaasDealsService | undefined;

export function getSaasDealsService(): SaasDealsService {
  if (!cached) {
    cached = new SaasDealsService(DbClient.getInstance());
  }
  return cached;
}

export function resetSaasDealsServiceForTests(): void {
  cached = undefined;
}
