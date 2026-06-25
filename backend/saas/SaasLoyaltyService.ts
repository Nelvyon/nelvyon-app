/**
 * SaasLoyaltyService — programa de fidelización por tenant.
 * Tables: saas_loyalty_programs, saas_loyalty_balances, saas_loyalty_transactions (migration 442).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export interface LoyaltyTier { name: string; min_points: number }

export interface LoyaltyProgram {
  id: string; tenantId: string; pointsPerEur: number;
  tiers: LoyaltyTier[]; active: boolean;
  createdAt: string; updatedAt: string;
}

export interface LoyaltyBalance {
  id: string; tenantId: string; contactId: string;
  points: number; tier: string; updatedAt: string;
}

export interface LoyaltyTransaction {
  id: string; tenantId: string; contactId: string;
  type: "earn" | "redeem" | "adjust";
  points: number; reason: string | null; referenceId: string | null;
  createdAt: string;
}

export class SaasLoyaltyError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION" | "INSUFFICIENT") {
    super(message); this.name = "SaasLoyaltyError";
  }
}

const DEFAULT_TIERS: LoyaltyTier[] = [
  { name: "Bronze", min_points: 0 },
  { name: "Silver", min_points: 500 },
  { name: "Gold",   min_points: 2000 },
  { name: "Platinum", min_points: 5000 },
];

function mapProgram(r: Record<string, unknown>): LoyaltyProgram {
  let tiers = DEFAULT_TIERS;
  try {
    const raw = r.tiers;
    if (typeof raw === "string") tiers = JSON.parse(raw) as LoyaltyTier[];
    else if (Array.isArray(raw)) tiers = raw as LoyaltyTier[];
  } catch { /* keep defaults */ }
  return {
    id: String(r.id), tenantId: String(r.tenant_id ?? r.tenantId),
    pointsPerEur: Number(r.points_per_eur ?? 1),
    tiers, active: Boolean(r.active),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function mapBalance(r: Record<string, unknown>): LoyaltyBalance {
  return {
    id: String(r.id), tenantId: String(r.tenant_id ?? r.tenantId),
    contactId: String(r.contact_id), points: Number(r.points ?? 0),
    tier: String(r.tier ?? "Bronze"),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function mapTxn(r: Record<string, unknown>): LoyaltyTransaction {
  return {
    id: String(r.id), tenantId: String(r.tenant_id ?? r.tenantId),
    contactId: String(r.contact_id),
    type: String(r.type ?? "earn") as "earn" | "redeem" | "adjust",
    points: Number(r.points ?? 0),
    reason: r.reason != null ? String(r.reason) : null,
    referenceId: r.reference_id != null ? String(r.reference_id) : null,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

function computeTier(points: number, tiers: LoyaltyTier[]): string {
  const sorted = [...tiers].sort((a, b) => b.min_points - a.min_points);
  return sorted.find(t => points >= t.min_points)?.name ?? "Bronze";
}

export class SaasLoyaltyService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Program ───────────────────────────────────────────────────────────────

  async getOrCreateProgram(tenantId: string): Promise<LoyaltyProgram> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_loyalty_programs WHERE tenant_id=$1 LIMIT 1`,
      [tenantId],
    );
    if (rows[0]) return mapProgram(rows[0]);
    const ins = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_loyalty_programs (tenant_id) VALUES ($1) RETURNING *`,
      [tenantId],
    );
    if (!ins[0]) throw new SaasLoyaltyError("Error creating program", "VALIDATION");
    return mapProgram(ins[0]);
  }

  async updateProgram(tenantId: string, patch: { pointsPerEur?: number; tiers?: LoyaltyTier[]; active?: boolean }): Promise<LoyaltyProgram> {
    await this.getOrCreateProgram(tenantId);
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [tenantId];
    let i = 2;
    if (patch.pointsPerEur !== undefined) { sets.push(`points_per_eur=$${i++}`); params.push(patch.pointsPerEur); }
    if (patch.tiers        !== undefined) { sets.push(`tiers=$${i++}`);           params.push(JSON.stringify(patch.tiers)); }
    if (patch.active       !== undefined) { sets.push(`active=$${i++}`);           params.push(patch.active); }
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_loyalty_programs SET ${sets.join(",")} WHERE tenant_id=$1 RETURNING *`,
      params,
    );
    if (!rows[0]) throw new SaasLoyaltyError("Program not found", "NOT_FOUND");
    return mapProgram(rows[0]);
  }

  // ── Points ────────────────────────────────────────────────────────────────

  async earnPoints(tenantId: string, contactId: string, eurAmount: number, reason?: string, referenceId?: string): Promise<LoyaltyBalance> {
    const program = await this.getOrCreateProgram(tenantId);
    const points = Math.floor(eurAmount * program.pointsPerEur);
    if (points <= 0) throw new SaasLoyaltyError("Importe demasiado pequeño para ganar puntos", "VALIDATION");

    await this.db.query(
      `INSERT INTO saas_loyalty_balances (tenant_id, contact_id, points, tier)
       VALUES ($1, $2::uuid, $3, 'Bronze')
       ON CONFLICT (tenant_id, contact_id) DO UPDATE
         SET points = saas_loyalty_balances.points + $3, updated_at = NOW()`,
      [tenantId, contactId, points],
    );
    await this.db.query(
      `INSERT INTO saas_loyalty_transactions (tenant_id, contact_id, type, points, reason, reference_id)
       VALUES ($1, $2::uuid, 'earn', $3, $4, $5)`,
      [tenantId, contactId, points, reason ?? null, referenceId ?? null],
    );
    return this._refreshTier(tenantId, contactId, program);
  }

  async redeemPoints(tenantId: string, contactId: string, points: number, reason?: string): Promise<LoyaltyBalance> {
    if (points <= 0) throw new SaasLoyaltyError("Los puntos a canjear deben ser positivos", "VALIDATION");
    const program = await this.getOrCreateProgram(tenantId);
    const balance = await this.getBalance(tenantId, contactId);
    if (balance.points < points) throw new SaasLoyaltyError("Saldo insuficiente", "INSUFFICIENT");

    await this.db.query(
      `UPDATE saas_loyalty_balances SET points = points - $3, updated_at = NOW()
       WHERE tenant_id=$1 AND contact_id=$2::uuid`,
      [tenantId, contactId, points],
    );
    await this.db.query(
      `INSERT INTO saas_loyalty_transactions (tenant_id, contact_id, type, points, reason)
       VALUES ($1, $2::uuid, 'redeem', $3, $4)`,
      [tenantId, contactId, points, reason ?? null],
    );
    return this._refreshTier(tenantId, contactId, program);
  }

  async adjustPoints(tenantId: string, contactId: string, points: number, reason?: string): Promise<LoyaltyBalance> {
    const program = await this.getOrCreateProgram(tenantId);
    await this.db.query(
      `INSERT INTO saas_loyalty_balances (tenant_id, contact_id, points, tier)
       VALUES ($1, $2::uuid, GREATEST(0, $3), 'Bronze')
       ON CONFLICT (tenant_id, contact_id) DO UPDATE
         SET points = GREATEST(0, saas_loyalty_balances.points + $3), updated_at = NOW()`,
      [tenantId, contactId, points],
    );
    await this.db.query(
      `INSERT INTO saas_loyalty_transactions (tenant_id, contact_id, type, points, reason)
       VALUES ($1, $2::uuid, 'adjust', $3, $4)`,
      [tenantId, contactId, points, reason ?? null],
    );
    return this._refreshTier(tenantId, contactId, program);
  }

  // ── Balances ──────────────────────────────────────────────────────────────

  async getBalance(tenantId: string, contactId: string): Promise<LoyaltyBalance> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_loyalty_balances WHERE tenant_id=$1 AND contact_id=$2::uuid LIMIT 1`,
      [tenantId, contactId],
    );
    if (rows[0]) return mapBalance(rows[0]);
    // Return zero balance if not yet enrolled
    return { id: "", tenantId, contactId, points: 0, tier: "Bronze", updatedAt: new Date().toISOString() };
  }

  async listBalances(tenantId: string): Promise<LoyaltyBalance[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_loyalty_balances WHERE tenant_id=$1 ORDER BY points DESC LIMIT 500`,
      [tenantId],
    );
    return rows.map(mapBalance);
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  async getTransactions(tenantId: string, contactId: string): Promise<LoyaltyTransaction[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_loyalty_transactions WHERE tenant_id=$1 AND contact_id=$2::uuid
       ORDER BY created_at DESC LIMIT 100`,
      [tenantId, contactId],
    );
    return rows.map(mapTxn);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async _refreshTier(tenantId: string, contactId: string, program: LoyaltyProgram): Promise<LoyaltyBalance> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_loyalty_balances WHERE tenant_id=$1 AND contact_id=$2::uuid LIMIT 1`,
      [tenantId, contactId],
    );
    if (!rows[0]) return { id: "", tenantId, contactId, points: 0, tier: "Bronze", updatedAt: new Date().toISOString() };
    const bal = mapBalance(rows[0]);
    const newTier = computeTier(bal.points, program.tiers);
    if (newTier !== bal.tier) {
      await this.db.query(
        `UPDATE saas_loyalty_balances SET tier=$3, updated_at=NOW() WHERE tenant_id=$1 AND contact_id=$2::uuid`,
        [tenantId, contactId, newTier],
      );
      bal.tier = newTier;
    }
    return bal;
  }
}

let _svc: SaasLoyaltyService | undefined;
export function getSaasLoyaltyService(): SaasLoyaltyService {
  _svc ??= new SaasLoyaltyService();
  return _svc;
}
export function resetSaasLoyaltyServiceForTests(): void { _svc = undefined; }
