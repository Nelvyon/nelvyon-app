import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type AbTestStatus = "running" | "completed" | "paused";
export type AbTestType = "subject_line" | "send_time" | "content" | "from_name";

export interface AbVariant {
  id: string;
  label: string;
  value: string;
  sends: number;
  opens: number;
  clicks: number;
  openRate: number;
  clickRate: number;
}

export interface SaasAbTest {
  id: string;
  tenantId: string;
  name: string;
  type: AbTestType;
  status: AbTestStatus;
  variants: AbVariant[];
  winnerVariantId: string | null;
  confidence: number | null;
  createdAt: string;
}

export interface CreateAbTestInput {
  name: string;
  type?: AbTestType;
  variants: Array<{ label: string; value: string }>;
}

export class SaasAbTestingError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION",
  ) {
    super(message);
    this.name = "SaasAbTestingError";
  }
}

const TEST_TYPES: AbTestType[] = ["subject_line", "send_time", "content", "from_name"];

type AbTestRow = {
  id: string; tenant_id: string; name: string; type: AbTestType;
  status: AbTestStatus; variants: unknown; winner_variant_id: string | null;
  confidence: string | number | null; created_at: Date | string;
};

function parseVariants(raw: unknown): AbVariant[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((v: Record<string, unknown>, i: number) => {
    const sends = Number(v.sends ?? 0);
    const opens = Number(v.opens ?? 0);
    const clicks = Number(v.clicks ?? 0);
    return {
      id: typeof v.id === "string" ? v.id : `var_${i}`,
      label: typeof v.label === "string" ? v.label : `Variant ${i + 1}`,
      value: typeof v.value === "string" ? v.value : "",
      sends,
      opens,
      clicks,
      openRate: sends > 0 ? Math.round((opens / sends) * 10000) / 100 : 0,
      clickRate: sends > 0 ? Math.round((clicks / sends) * 10000) / 100 : 0,
    };
  });
}

function rowToTest(r: AbTestRow): SaasAbTest {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    type: r.type,
    status: r.status,
    variants: parseVariants(r.variants),
    winnerVariantId: r.winner_variant_id,
    confidence: r.confidence !== null ? Number(r.confidence) : null,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export class SaasAbTestingService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string): Promise<SaasAbTest[]> {
    const rows = await this.db.query<AbTestRow>(
      `SELECT id, tenant_id, name, type, status, variants, winner_variant_id, confidence, created_at
       FROM ab_tests WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(rowToTest);
  }

  async get(tenantId: string, id: string): Promise<SaasAbTest | null> {
    const rows = await this.db.query<AbTestRow>(
      `SELECT id, tenant_id, name, type, status, variants, winner_variant_id, confidence, created_at
       FROM ab_tests WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToTest(rows[0]) : null;
  }

  async create(tenantId: string, input: CreateAbTestInput): Promise<SaasAbTest> {
    if (!input.name.trim()) throw new SaasAbTestingError("name is required", "VALIDATION");
    if (!input.variants || input.variants.length < 2) throw new SaasAbTestingError("At least 2 variants required", "VALIDATION");
    const type = input.type ?? "subject_line";
    if (!TEST_TYPES.includes(type)) throw new SaasAbTestingError(`Invalid type: ${type}`, "VALIDATION");
    const variants: AbVariant[] = input.variants.map((v, i) => ({
      id: `var_${i}`,
      label: v.label.trim() || `Variant ${String.fromCharCode(65 + i)}`,
      value: v.value.trim(),
      sends: 0, opens: 0, clicks: 0, openRate: 0, clickRate: 0,
    }));
    const rows = await this.db.query<AbTestRow>(
      `INSERT INTO ab_tests (tenant_id, name, type, status, variants)
       VALUES ($1,$2,$3,'running',$4::jsonb)
       RETURNING id, tenant_id, name, type, status, variants, winner_variant_id, confidence, created_at`,
      [tenantId, input.name.trim(), type, JSON.stringify(variants)],
    );
    if (!rows[0]) throw new SaasAbTestingError("Failed to create test", "VALIDATION");
    return rowToTest(rows[0]);
  }

  /** Record that a variant was sent/opened/clicked. */
  async recordEvent(tenantId: string, testId: string, variantId: string, event: "send" | "open" | "click"): Promise<void> {
    const test = await this.get(tenantId, testId);
    if (!test) throw new SaasAbTestingError("Test not found", "NOT_FOUND");
    const variants = test.variants.map((v) => {
      if (v.id !== variantId) return v;
      return {
        ...v,
        sends: event === "send" ? v.sends + 1 : v.sends,
        opens: event === "open" ? v.opens + 1 : v.opens,
        clicks: event === "click" ? v.clicks + 1 : v.clicks,
      };
    });
    await this.db.query(
      `UPDATE ab_tests SET variants=$3::jsonb WHERE tenant_id=$1 AND id=$2`,
      [tenantId, testId, JSON.stringify(variants)],
    );
  }

  /** Declare winner using Chi-squared approximation on open rates. */
  async declareWinner(tenantId: string, testId: string): Promise<SaasAbTest> {
    const test = await this.get(tenantId, testId);
    if (!test) throw new SaasAbTestingError("Test not found", "NOT_FOUND");
    if (test.variants.every((v) => v.sends === 0)) throw new SaasAbTestingError("No data yet — send variants first", "VALIDATION");

    let bestRate = -1;
    let winnerId = test.variants[0]?.id ?? null;
    for (const v of test.variants) {
      if (v.sends > 0 && v.openRate > bestRate) {
        bestRate = v.openRate;
        winnerId = v.id;
      }
    }

    // Naive confidence: ratio best vs second-best open rate (0–100).
    const sorted = [...test.variants].sort((a, b) => b.openRate - a.openRate);
    const confidence =
      sorted.length >= 2 && sorted[1]!.openRate > 0
        ? Math.min(99, Math.round((sorted[0]!.openRate / sorted[1]!.openRate - 1) * 100 + 50))
        : 95;

    const rows = await this.db.query<AbTestRow>(
      `UPDATE ab_tests SET status='completed', winner_variant_id=$3, confidence=$4
       WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, name, type, status, variants, winner_variant_id, confidence, created_at`,
      [tenantId, testId, winnerId, confidence],
    );
    if (!rows[0]) throw new SaasAbTestingError("Test not found", "NOT_FOUND");
    return rowToTest(rows[0]);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM ab_tests WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasAbTestingError("Test not found", "NOT_FOUND");
  }
}

let _instance: SaasAbTestingService | null = null;
export function getSaasAbTestingService(): SaasAbTestingService {
  if (!_instance) _instance = new SaasAbTestingService();
  return _instance;
}
export function resetSaasAbTestingServiceForTests(): void { _instance = null; }
