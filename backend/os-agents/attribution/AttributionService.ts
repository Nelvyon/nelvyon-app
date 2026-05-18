import { DbClient } from "../../db/DbClient";
import type { AttributionChannelResult, AttributionModel, AttributionReport, Touchpoint } from "./types";

type TouchpointRow = {
  id: string;
  user_id: string;
  contact_id: string | null;
  channel: string;
  campaign: string | null;
  source: string | null;
  medium: string | null;
  content: string | null;
  converted: boolean;
  revenue: number | string;
  occurred_at: Date | string;
  created_at: Date | string;
};

type ReportRow = {
  id: string;
  user_id: string;
  model: string;
  period_start: Date | string | null;
  period_end: Date | string | null;
  results: unknown;
  created_at: Date | string;
};

type TouchpointFilters = {
  channel?: string;
  converted?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

const MODELS: readonly AttributionModel[] = ["first_touch", "last_touch", "linear", "time_decay", "position_based"] as const;

function n(v: unknown): number {
  const out = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(out) ? out : 0;
}

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function toIsoOrNull(v: Date | string | null): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.toISOString();
}

function rowToTouchpoint(r: TouchpointRow): Touchpoint {
  return {
    id: r.id,
    userId: r.user_id,
    contactId: r.contact_id,
    channel: r.channel,
    campaign: r.campaign,
    source: r.source,
    medium: r.medium,
    content: r.content,
    converted: Boolean(r.converted),
    revenue: n(r.revenue),
    occurredAt: toIso(r.occurred_at),
    createdAt: toIso(r.created_at),
  };
}

function rowToReport(r: ReportRow): AttributionReport {
  return {
    id: r.id,
    userId: r.user_id,
    model: r.model,
    periodStart: toIsoOrNull(r.period_start),
    periodEnd: toIsoOrNull(r.period_end),
    results: Array.isArray(r.results) ? (r.results as AttributionChannelResult[]) : [],
    createdAt: toIso(r.created_at),
  };
}

function assertModel(model: string): AttributionModel {
  if ((MODELS as readonly string[]).includes(model)) return model as AttributionModel;
  throw new Error("model inválido");
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.max(0, b.getTime() - a.getTime());
  return ms / (24 * 60 * 60 * 1000);
}

type CreditAccumulator = Record<string, { credit: number; conversions: number; revenue: number }>;

function addCredit(
  acc: CreditAccumulator,
  channel: string,
  creditShare: number,
  conversionShare: number,
  revenueShare: number,
): void {
  if (!acc[channel]) acc[channel] = { credit: 0, conversions: 0, revenue: 0 };
  acc[channel].credit += creditShare;
  acc[channel].conversions += conversionShare;
  acc[channel].revenue += revenueShare;
}

export class AttributionService {
  static async recordTouchpoint(
    userId: string,
    data: {
      channel: string;
      campaign?: string | null;
      source?: string | null;
      medium?: string | null;
      content?: string | null;
      converted?: boolean;
      revenue?: number;
      contactId?: string | null;
      occurredAt?: string;
    },
  ): Promise<Touchpoint> {
    if (!data.channel?.trim()) throw new Error("channel requerido");
    const rows = await DbClient.getInstance().query<TouchpointRow>(
      `INSERT INTO attribution_touchpoints
        (user_id, contact_id, channel, campaign, source, medium, content, converted, revenue, occurred_at, created_at)
       VALUES
        ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, COALESCE($8, false), COALESCE($9, 0), COALESCE($10::timestamptz, now()), now())
       RETURNING id, user_id, contact_id, channel, campaign, source, medium, content, converted, revenue, occurred_at, created_at`,
      [
        userId,
        data.contactId ?? null,
        data.channel.trim(),
        data.campaign ?? null,
        data.source ?? null,
        data.medium ?? null,
        data.content ?? null,
        Boolean(data.converted),
        Number.isFinite(Number(data.revenue)) ? Number(data.revenue) : 0,
        data.occurredAt ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("recordTouchpoint: sin fila");
    return rowToTouchpoint(row);
  }

  static async getTouchpoints(userId: string, filters?: TouchpointFilters): Promise<Touchpoint[]> {
    const where: string[] = ["user_id = $1::uuid"];
    const params: unknown[] = [userId];
    let i = 2;
    if (filters?.channel?.trim()) {
      where.push(`channel = $${i}`);
      params.push(filters.channel.trim());
      i++;
    }
    if (typeof filters?.converted === "boolean") {
      where.push(`converted = $${i}`);
      params.push(filters.converted);
      i++;
    }
    if (filters?.dateFrom) {
      where.push(`occurred_at >= $${i}::timestamptz`);
      params.push(filters.dateFrom);
      i++;
    }
    if (filters?.dateTo) {
      where.push(`occurred_at <= $${i}::timestamptz`);
      params.push(filters.dateTo);
      i++;
    }
    const rows = await DbClient.getInstance().query<TouchpointRow>(
      `SELECT id, user_id, contact_id, channel, campaign, source, medium, content, converted, revenue, occurred_at, created_at
       FROM attribution_touchpoints
       WHERE ${where.join(" AND ")}
       ORDER BY occurred_at ASC`,
      params,
    );
    return rows.map(rowToTouchpoint);
  }

  static async runModel(
    userId: string,
    model: AttributionModel | string,
    periodStart?: string | null,
    periodEnd?: string | null,
  ): Promise<AttributionReport> {
    const m = assertModel(model);
    const touchpoints = await AttributionService.getTouchpoints(userId, {
      dateFrom: periodStart ?? undefined,
      dateTo: periodEnd ?? undefined,
    });
    const conversions = touchpoints.filter((t) => t.converted);
    const acc: CreditAccumulator = {};

    for (const conv of conversions) {
      const convDate = new Date(conv.occurredAt);
      const key = conv.contactId ?? conv.id;
      const journey = touchpoints.filter((t) => (t.contactId ?? t.id) === key && new Date(t.occurredAt) <= convDate);
      if (journey.length === 0) continue;

      if (m === "first_touch") {
        addCredit(acc, journey[0].channel, 1, 1, conv.revenue);
        continue;
      }
      if (m === "last_touch") {
        addCredit(acc, journey[journey.length - 1].channel, 1, 1, conv.revenue);
        continue;
      }
      if (m === "linear") {
        const each = 1 / journey.length;
        for (const t of journey) addCredit(acc, t.channel, each, each, conv.revenue * each);
        continue;
      }
      if (m === "time_decay") {
        const weights = journey.map((t) => Math.pow(0.5, daysBetween(new Date(t.occurredAt), convDate)));
        const sum = weights.reduce((s, w) => s + w, 0) || 1;
        journey.forEach((t, idx) => {
          const w = weights[idx] / sum;
          addCredit(acc, t.channel, w, w, conv.revenue * w);
        });
        continue;
      }
      // position_based
      if (journey.length === 1) {
        addCredit(acc, journey[0].channel, 1, 1, conv.revenue);
      } else if (journey.length === 2) {
        addCredit(acc, journey[0].channel, 0.5, 0.5, conv.revenue * 0.5);
        addCredit(acc, journey[1].channel, 0.5, 0.5, conv.revenue * 0.5);
      } else {
        const middle = journey.slice(1, -1);
        const middleEach = middle.length > 0 ? 0.2 / middle.length : 0;
        addCredit(acc, journey[0].channel, 0.4, 0.4, conv.revenue * 0.4);
        for (const t of middle) addCredit(acc, t.channel, middleEach, middleEach, conv.revenue * middleEach);
        addCredit(acc, journey[journey.length - 1].channel, 0.4, 0.4, conv.revenue * 0.4);
      }
    }

    const totalCredit = Object.values(acc).reduce((s, x) => s + x.credit, 0) || 1;
    const results: AttributionChannelResult[] = Object.entries(acc)
      .map(([channel, v]) => ({
        channel,
        credit: (v.credit / totalCredit) * 100,
        conversions: v.conversions,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.credit - a.credit);

    const rows = await DbClient.getInstance().query<ReportRow>(
      `INSERT INTO attribution_reports (user_id, model, period_start, period_end, results, created_at)
       VALUES ($1::uuid, $2, $3::timestamptz, $4::timestamptz, $5::jsonb, now())
       RETURNING id, user_id, model, period_start, period_end, results, created_at`,
      [userId, m, periodStart ?? null, periodEnd ?? null, JSON.stringify(results)],
    );
    const row = rows[0];
    if (!row) throw new Error("runModel: sin reporte");
    return rowToReport(row);
  }

  static async compareModels(
    userId: string,
    periodStart?: string | null,
    periodEnd?: string | null,
  ): Promise<Record<AttributionModel, AttributionReport>> {
    const out = {} as Record<AttributionModel, AttributionReport>;
    for (const model of MODELS) {
      out[model] = await AttributionService.runModel(userId, model, periodStart ?? null, periodEnd ?? null);
    }
    return out;
  }
}
