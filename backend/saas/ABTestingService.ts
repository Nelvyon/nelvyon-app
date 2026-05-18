import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type ABMetric = "clicks" | "conversions" | "opens";
export type ABTestStatus = "running" | "completed" | "winner_selected";

export type ABVariantInput = { name: string; content: string };
export type CreateABTestConfig = {
  name: string;
  variants: ABVariantInput[];
  metric: ABMetric;
  duration_days: number;
};

export type ABVariantMetrics = {
  variantId: string;
  name: string;
  content: string;
  status: "running" | "paused" | "winner";
  clicks: number;
  conversions: number;
  opens: number;
  conversionRate: number;
};

export type ABTest = {
  id: string;
  userId: string;
  name: string;
  metric: ABMetric;
  durationDays: number;
  status: ABTestStatus;
  winnerVariantId: string | null;
  createdAt: string;
  updatedAt: string;
  variants: ABVariantMetrics[];
};

type ABTestingServiceDeps = {
  db?: Pick<DbClient, "query">;
};

function n(v: unknown): number {
  const out = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(out) ? out : 0;
}

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

const METRICS: readonly ABMetric[] = ["clicks", "conversions", "opens"] as const;

function assertMetric(metric: string): ABMetric {
  if ((METRICS as readonly string[]).includes(metric)) return metric as ABMetric;
  throw new Error("Invalid metric");
}

export class ABTestingService {
  constructor(private readonly deps: ABTestingServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async createTest(userId: string, config: CreateABTestConfig): Promise<ABTest> {
    const name = config.name.trim();
    if (!name) throw new Error("name requerido");
    if (!Array.isArray(config.variants) || config.variants.length < 2 || config.variants.length > 4) {
      throw new Error("Se requieren 2-4 variantes");
    }
    const metric = assertMetric(config.metric);
    const duration = Math.max(1, Math.min(30, Math.round(config.duration_days)));
    const testRows = await this.db.query<{
      id: string;
      user_id: string;
      name: string;
      metric: ABMetric;
      duration_days: number | string;
      status: ABTestStatus;
      winner_variant_id: string | null;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `INSERT INTO ab_tests (user_id, name, metric, duration_days, status, winner_variant_id, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, $4::int, 'running', NULL, NOW(), NOW())
       RETURNING id::text, user_id::text, name, metric, duration_days, status, winner_variant_id::text, created_at, updated_at`,
      [userId, name, metric, duration],
    );
    const test = testRows[0];
    for (const variant of config.variants) {
      const vName = variant.name.trim();
      const content = variant.content.trim();
      if (!vName || !content) throw new Error("Variante inválida");
      await this.db.query(
        `INSERT INTO ab_test_variants (test_id, name, content, status, created_at, updated_at)
         VALUES ($1::uuid, $2, $3, 'running', NOW(), NOW())`,
        [test.id, vName, content],
      );
    }
    const out = await this.getTest(test.id);
    if (!out) throw new Error("No se pudo crear test");
    return out;
  }

  async getTest(testId: string): Promise<ABTest | null> {
    const testRows = await this.db.query<{
      id: string;
      user_id: string;
      name: string;
      metric: ABMetric;
      duration_days: number | string;
      status: ABTestStatus;
      winner_variant_id: string | null;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, name, metric, duration_days, status, winner_variant_id::text, created_at, updated_at
       FROM ab_tests WHERE id = $1::uuid LIMIT 1`,
      [testId],
    );
    const t = testRows[0];
    if (!t) return null;
    const varRows = await this.db.query<{
      id: string;
      name: string;
      content: string;
      status: "running" | "paused" | "winner";
      clicks: string;
      conversions: string;
      opens: string;
    }>(
      `SELECT v.id::text, v.name, v.content, v.status,
         COALESCE(SUM(CASE WHEN r.metric = 'clicks' THEN r.value ELSE 0 END), 0)::text as clicks,
         COALESCE(SUM(CASE WHEN r.metric = 'conversions' THEN r.value ELSE 0 END), 0)::text as conversions,
         COALESCE(SUM(CASE WHEN r.metric = 'opens' THEN r.value ELSE 0 END), 0)::text as opens
       FROM ab_test_variants v
       LEFT JOIN ab_test_results r ON r.variant_id = v.id
       WHERE v.test_id = $1::uuid
       GROUP BY v.id, v.name, v.content, v.status
       ORDER BY v.created_at ASC`,
      [testId],
    );
    const variants: ABVariantMetrics[] = varRows.map((v) => {
      const opens = n(v.opens);
      const conversions = n(v.conversions);
      const rate = opens > 0 ? (conversions / opens) * 100 : 0;
      return {
        variantId: v.id,
        name: v.name,
        content: v.content,
        status: v.status,
        clicks: n(v.clicks),
        conversions,
        opens,
        conversionRate: rate,
      };
    });
    return {
      id: t.id,
      userId: t.user_id,
      name: t.name,
      metric: t.metric,
      durationDays: n(t.duration_days),
      status: t.status,
      winnerVariantId: t.winner_variant_id,
      createdAt: toIso(t.created_at),
      updatedAt: toIso(t.updated_at),
      variants,
    };
  }

  async getActiveTests(userId: string): Promise<ABTest[]> {
    const rows = await this.db.query<{ id: string }>(
      `SELECT id::text FROM ab_tests
       WHERE user_id = $1::uuid AND status = 'running'
       ORDER BY created_at DESC`,
      [userId],
    );
    const tests = await Promise.all(rows.map((r) => this.getTest(r.id)));
    return tests.filter((t): t is ABTest => Boolean(t));
  }

  async recordResult(testId: string, variantId: string, metric: ABMetric, value: number): Promise<void> {
    const m = assertMetric(metric);
    const safeValue = Math.max(0, Math.round(value));
    await this.db.query(
      `INSERT INTO ab_test_results (test_id, variant_id, metric, value, created_at)
       VALUES ($1::uuid, $2::uuid, $3, $4::int, NOW())`,
      [testId, variantId, m, safeValue],
    );
    await this.db.query(`UPDATE ab_tests SET updated_at = NOW() WHERE id = $1::uuid`, [testId]);
  }

  async evaluateWinner(testId: string): Promise<{ winnerVariantId: string | null; reason: string }> {
    const test = await this.getTest(testId);
    if (!test) throw new Error("Test no encontrado");
    if (test.variants.length < 2) return { winnerVariantId: null, reason: "No hay suficientes variantes" };
    const sorted = [...test.variants].sort((a, b) => {
      const av = test.metric === "clicks" ? a.clicks : test.metric === "opens" ? a.opens : a.conversions;
      const bv = test.metric === "clicks" ? b.clicks : test.metric === "opens" ? b.opens : b.conversions;
      return bv - av;
    });
    const best = sorted[0];
    const second = sorted[1];
    const bestValue = test.metric === "clicks" ? best.clicks : test.metric === "opens" ? best.opens : best.conversions;
    const secondValue = test.metric === "clicks" ? second.clicks : test.metric === "opens" ? second.opens : second.conversions;
    if (bestValue <= 0) return { winnerVariantId: null, reason: "Sin datos suficientes" };
    const threshold = secondValue * 1.2;
    if (bestValue > threshold) {
      return { winnerVariantId: best.variantId, reason: `Ganador por mejora >20% en ${test.metric}` };
    }
    return { winnerVariantId: null, reason: "Sin significancia simplificada (p<0.05 proxy)" };
  }

  async applyWinner(testId: string): Promise<{ winnerVariantId: string | null; status: ABTestStatus }> {
    const evaluated = await this.evaluateWinner(testId);
    if (!evaluated.winnerVariantId) {
      return { winnerVariantId: null, status: "running" };
    }
    await this.db.query(
      `UPDATE ab_test_variants
       SET status = CASE WHEN id = $2::uuid THEN 'winner' ELSE 'paused' END,
           updated_at = NOW()
       WHERE test_id = $1::uuid`,
      [testId, evaluated.winnerVariantId],
    );
    await this.db.query(
      `UPDATE ab_tests
       SET status = 'winner_selected',
           winner_variant_id = $2::uuid,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [testId, evaluated.winnerVariantId],
    );
    await this.db.query(
      `INSERT INTO ab_test_history (test_id, event_type, payload, created_at)
       VALUES ($1::uuid, 'winner_applied', $2::jsonb, NOW())`,
      [testId, JSON.stringify({ winnerVariantId: evaluated.winnerVariantId })],
    );
    return { winnerVariantId: evaluated.winnerVariantId, status: "winner_selected" };
  }
}

let cachedABTestingService: ABTestingService | undefined;

export function getABTestingService(): ABTestingService {
  if (!cachedABTestingService) cachedABTestingService = new ABTestingService();
  return cachedABTestingService;
}

export function resetABTestingServiceForTests(): void {
  cachedABTestingService = undefined;
}
