import { DbClient } from "../../db/DbClient";
import type { AbEventType, AbExperiment, AbVariant } from "./types";

type ExperimentRow = {
  id: string;
  user_id: string;
  name: string;
  channel: string;
  status: string;
  winner_variant: string | null;
  confidence_threshold: number | string;
  created_at: Date | string;
  updated_at: Date | string;
};

type VariantRow = {
  id: string;
  experiment_id: string;
  name: string;
  content: string;
  impressions: number | string;
  clicks: number | string;
  conversions: number | string;
  created_at: Date | string;
};

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function n(v: unknown): number {
  const out = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(out) ? out : 0;
}

function rowToExperiment(r: ExperimentRow): AbExperiment {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    channel: r.channel,
    status: r.status,
    winnerVariant: r.winner_variant,
    confidenceThreshold: n(r.confidence_threshold),
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function rowToVariant(r: VariantRow): AbVariant {
  return {
    id: r.id,
    experimentId: r.experiment_id,
    name: r.name,
    content: r.content,
    impressions: n(r.impressions),
    clicks: n(r.clicks),
    conversions: n(r.conversions),
    createdAt: toIso(r.created_at),
  };
}

function zCritical(confidence: number): number {
  if (confidence >= 0.99) return 2.576;
  if (confidence >= 0.98) return 2.326;
  if (confidence >= 0.95) return 1.96;
  if (confidence >= 0.9) return 1.645;
  return 1.282;
}

function zScore(bestConv: number, bestImp: number, otherConv: number, otherImp: number): number {
  if (bestImp <= 0 || otherImp <= 0) return 0;
  const p1 = bestConv / bestImp;
  const p2 = otherConv / otherImp;
  const pooled = (bestConv + otherConv) / (bestImp + otherImp);
  const denom = Math.sqrt(Math.max(1e-12, pooled * (1 - pooled) * (1 / bestImp + 1 / otherImp)));
  return (p1 - p2) / denom;
}

const EVENTS: readonly AbEventType[] = ["impression", "click", "conversion"] as const;

function assertEventType(eventType: string): AbEventType {
  if ((EVENTS as readonly string[]).includes(eventType)) return eventType as AbEventType;
  throw new Error("eventType inválido");
}

const CHANNELS = new Set(["email", "social", "ads", "landing"]);

export class AbTestingService {
  static async createExperiment(
    userId: string,
    name: string,
    channel: string,
    variants: Array<{ name: string; content: string }>,
    confidenceThreshold = 0.95,
  ): Promise<AbExperiment> {
    const expName = name.trim();
    const ch = channel.trim().toLowerCase();
    if (!expName) throw new Error("name requerido");
    if (!CHANNELS.has(ch)) throw new Error("channel inválido");
    if (!Array.isArray(variants) || variants.length < 2) throw new Error("Se requieren al menos 2 variantes");

    const experimentRows = await DbClient.getInstance().query<ExperimentRow>(
      `INSERT INTO ab_experiments (user_id, name, channel, status, winner_variant, confidence_threshold, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, 'running', NULL, $4, now(), now())
       RETURNING id, user_id, name, channel, status, winner_variant, confidence_threshold, created_at, updated_at`,
      [userId, expName, ch, confidenceThreshold],
    );
    const experiment = experimentRows[0];
    if (!experiment) throw new Error("createExperiment: sin experimento");

    for (const v of variants) {
      const vn = v.name.trim();
      const vc = v.content.trim();
      if (!vn || !vc) throw new Error("Variante inválida");
      await DbClient.getInstance().query(
        `INSERT INTO ab_variants (experiment_id, name, content, impressions, clicks, conversions, created_at)
         VALUES ($1::uuid, $2, $3, 0, 0, 0, now())`,
        [experiment.id, vn, vc],
      );
    }

    const created = rowToExperiment(experiment);
    created.variants = await AbTestingService.getVariants(created.id);
    return created;
  }

  static async recordEvent(variantId: string, eventType: AbEventType): Promise<void> {
    const et = assertEventType(eventType);
    const field = et === "impression" ? "impressions" : et === "click" ? "clicks" : "conversions";
    await DbClient.getInstance().query(
      `UPDATE ab_variants
       SET ${field} = ${field} + 1
       WHERE id = $1::uuid`,
      [variantId],
    );
    await DbClient.getInstance().query(
      `UPDATE ab_experiments e
       SET updated_at = now()
       FROM ab_variants v
       WHERE v.id = $1::uuid AND e.id = v.experiment_id`,
      [variantId],
    );
  }

  static async detectWinner(experimentId: string): Promise<string | null> {
    const expRows = await DbClient.getInstance().query<ExperimentRow>(
      `SELECT id, user_id, name, channel, status, winner_variant, confidence_threshold, created_at, updated_at
       FROM ab_experiments WHERE id = $1::uuid LIMIT 1`,
      [experimentId],
    );
    const exp = expRows[0];
    if (!exp) throw new Error("Experimento no encontrado");

    const variants = await AbTestingService.getVariants(experimentId);
    if (variants.length < 2) return null;

    const ranked = [...variants].sort((a, b) => {
      const ra = a.impressions > 0 ? a.conversions / a.impressions : 0;
      const rb = b.impressions > 0 ? b.conversions / b.impressions : 0;
      return rb - ra;
    });
    const best = ranked[0];
    const others = ranked.slice(1);
    if (!best || best.impressions < 10) return null;

    const bestRate = best.conversions / Math.max(1, best.impressions);
    const crit = zCritical(n(exp.confidence_threshold));
    const significantAgainstAll = others.every((v) => {
      if (v.impressions < 10) return false;
      const vRate = v.conversions / Math.max(1, v.impressions);
      if (bestRate <= vRate) return false;
      return zScore(best.conversions, best.impressions, v.conversions, v.impressions) >= crit;
    });
    if (!significantAgainstAll) return null;

    await DbClient.getInstance().query(
      `UPDATE ab_experiments
       SET winner_variant = $2, status = 'done', updated_at = now()
       WHERE id = $1::uuid`,
      [experimentId, best.id],
    );
    return best.id;
  }

  static async getExperiments(userId: string, status?: string): Promise<AbExperiment[]> {
    const params: unknown[] = [userId];
    let where = "user_id = $1::uuid";
    if (typeof status === "string" && status.trim()) {
      params.push(status.trim());
      where += " AND status = $2";
    }
    const rows = await DbClient.getInstance().query<ExperimentRow>(
      `SELECT id, user_id, name, channel, status, winner_variant, confidence_threshold, created_at, updated_at
       FROM ab_experiments
       WHERE ${where}
       ORDER BY created_at DESC`,
      params,
    );
    const out = rows.map(rowToExperiment);
    for (const exp of out) {
      exp.variants = await AbTestingService.getVariants(exp.id);
    }
    return out;
  }

  static async getVariants(experimentId: string): Promise<AbVariant[]> {
    const rows = await DbClient.getInstance().query<VariantRow>(
      `SELECT id, experiment_id, name, content, impressions, clicks, conversions, created_at
       FROM ab_variants
       WHERE experiment_id = $1::uuid
       ORDER BY created_at ASC`,
      [experimentId],
    );
    return rows.map(rowToVariant);
  }
}
