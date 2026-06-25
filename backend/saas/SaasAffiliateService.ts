/**
 * SaasAffiliateService — programa de afiliados por tenant.
 * Tables: saas_affiliate_programs, saas_affiliate_links, saas_affiliate_commissions (migration 442).
 */
import { randomBytes } from "node:crypto";
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type CommissionStatus = "pending" | "approved" | "paid";

export interface AffiliateProgram {
  id: string; tenantId: string; commissionPct: number; cookieDays: number; active: boolean;
  createdAt: string; updatedAt: string;
}
export interface AffiliateLink {
  id: string; tenantId: string; code: string; affiliateUserId: string;
  clicks: number; conversions: number; active: boolean; createdAt: string;
  affiliateUrl: string;
}
export interface AffiliateCommission {
  id: string; tenantId: string; linkId: string; affiliateUserId: string;
  amount: number; commissionPct: number; commissionAmount: number;
  status: CommissionStatus; stripeTransferId: string | null;
  createdAt: string; updatedAt: string;
}
export interface AffiliateProgramStats {
  program: AffiliateProgram;
  links: AffiliateLink[];
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  totalConversions: number;
}

export class SaasAffiliateError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION" | "CONFLICT") {
    super(message); this.name = "SaasAffiliateError";
  }
}

function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  return Number.parseFloat(String(v ?? "0")) || 0;
}

function mapProgram(r: Record<string, unknown>): AffiliateProgram {
  return {
    id: String(r.id), tenantId: String(r.tenant_id ?? r.tenantId),
    commissionPct: toNum(r.commission_pct), cookieDays: Number(r.cookie_days ?? 30),
    active: Boolean(r.active),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function mapLink(r: Record<string, unknown>): AffiliateLink {
  const code = String(r.code ?? "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nelvyon.com";
  return {
    id: String(r.id), tenantId: String(r.tenant_id ?? r.tenantId),
    code, affiliateUserId: String(r.affiliate_user_id ?? ""),
    clicks: Number(r.clicks ?? 0), conversions: Number(r.conversions ?? 0),
    active: Boolean(r.active),
    createdAt: new Date(r.created_at as string).toISOString(),
    affiliateUrl: `${appUrl}/?ref=${code}`,
  };
}

function mapCommission(r: Record<string, unknown>): AffiliateCommission {
  return {
    id: String(r.id), tenantId: String(r.tenant_id ?? r.tenantId),
    linkId: String(r.link_id), affiliateUserId: String(r.affiliate_user_id),
    amount: toNum(r.amount), commissionPct: toNum(r.commission_pct),
    commissionAmount: toNum(r.commission_amount),
    status: String(r.status ?? "pending") as CommissionStatus,
    stripeTransferId: r.stripe_transfer_id != null ? String(r.stripe_transfer_id) : null,
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function generateCode(): string {
  return `AFF${randomBytes(4).toString("hex").toUpperCase()}`;
}

export class SaasAffiliateService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Program ───────────────────────────────────────────────────────────────

  async getOrCreateProgram(tenantId: string): Promise<AffiliateProgram> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_affiliate_programs WHERE tenant_id=$1 LIMIT 1`,
      [tenantId],
    );
    if (rows[0]) return mapProgram(rows[0]);
    const ins = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_affiliate_programs (tenant_id) VALUES ($1) RETURNING *`,
      [tenantId],
    );
    if (!ins[0]) throw new SaasAffiliateError("Error creating program", "VALIDATION");
    return mapProgram(ins[0]);
  }

  async updateProgram(tenantId: string, patch: { commissionPct?: number; cookieDays?: number; active?: boolean }): Promise<AffiliateProgram> {
    await this.getOrCreateProgram(tenantId);
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [tenantId];
    let i = 2;
    if (patch.commissionPct !== undefined) { sets.push(`commission_pct=$${i++}`); params.push(patch.commissionPct); }
    if (patch.cookieDays    !== undefined) { sets.push(`cookie_days=$${i++}`);    params.push(patch.cookieDays); }
    if (patch.active        !== undefined) { sets.push(`active=$${i++}`);          params.push(patch.active); }
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_affiliate_programs SET ${sets.join(",")} WHERE tenant_id=$1 RETURNING *`,
      params,
    );
    if (!rows[0]) throw new SaasAffiliateError("Program not found", "NOT_FOUND");
    return mapProgram(rows[0]);
  }

  // ── Links ─────────────────────────────────────────────────────────────────

  async generateLink(tenantId: string, affiliateUserId: string): Promise<AffiliateLink> {
    if (!affiliateUserId.trim()) throw new SaasAffiliateError("affiliateUserId es obligatorio", "VALIDATION");
    await this.getOrCreateProgram(tenantId);
    const code = generateCode();
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_affiliate_links (tenant_id, code, affiliate_user_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [tenantId, code, affiliateUserId.trim()],
    );
    if (!rows[0]) throw new SaasAffiliateError("Error creating link", "VALIDATION");
    return mapLink(rows[0]);
  }

  async listLinks(tenantId: string): Promise<AffiliateLink[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_affiliate_links WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(mapLink);
  }

  // ── Tracking ──────────────────────────────────────────────────────────────

  async trackClick(tenantId: string, code: string): Promise<void> {
    await this.db.query(
      `UPDATE saas_affiliate_links SET clicks=clicks+1 WHERE tenant_id=$1 AND code=$2 AND active=true`,
      [tenantId, code.toUpperCase()],
    );
  }

  async trackConversion(tenantId: string, code: string, amount: number): Promise<AffiliateCommission | null> {
    const links = await this.db.query<Record<string, unknown>>(
      `SELECT id, affiliate_user_id FROM saas_affiliate_links WHERE tenant_id=$1 AND code=$2 AND active=true LIMIT 1`,
      [tenantId, code.toUpperCase()],
    );
    if (!links[0]) return null;
    const linkId = String(links[0].id);
    const affiliateUserId = String(links[0].affiliate_user_id);

    const program = await this.getOrCreateProgram(tenantId);
    const commissionAmount = Math.round(amount * (program.commissionPct / 100) * 100) / 100;

    // Update link conversion count
    await this.db.query(
      `UPDATE saas_affiliate_links SET conversions=conversions+1 WHERE id=$1::uuid`,
      [linkId],
    );

    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_affiliate_commissions
         (tenant_id, link_id, affiliate_user_id, amount, commission_pct, commission_amount)
       VALUES ($1, $2::uuid, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, linkId, affiliateUserId, amount, program.commissionPct, commissionAmount],
    );
    return rows[0] ? mapCommission(rows[0]) : null;
  }

  // ── Commissions ───────────────────────────────────────────────────────────

  async listCommissions(tenantId: string, status?: CommissionStatus): Promise<AffiliateCommission[]> {
    const cond = status ? `AND status=$2` : "";
    const params: unknown[] = status ? [tenantId, status] : [tenantId];
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_affiliate_commissions WHERE tenant_id=$1 ${cond} ORDER BY created_at DESC LIMIT 200`,
      params,
    );
    return rows.map(mapCommission);
  }

  async approveCommission(tenantId: string, id: string): Promise<AffiliateCommission> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_affiliate_commissions SET status='approved', updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2::uuid AND status='pending' RETURNING *`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasAffiliateError("Comisión no encontrada o ya aprobada", "NOT_FOUND");
    return mapCommission(rows[0]);
  }

  async markPaid(tenantId: string, id: string, stripeTransferId?: string): Promise<AffiliateCommission> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_affiliate_commissions SET status='paid', stripe_transfer_id=$3, updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2::uuid AND status='approved' RETURNING *`,
      [tenantId, id, stripeTransferId ?? null],
    );
    if (!rows[0]) throw new SaasAffiliateError("Comisión no encontrada o no aprobada", "NOT_FOUND");
    return mapCommission(rows[0]);
  }

  async getPayoutSummary(tenantId: string): Promise<AffiliateProgramStats> {
    const program = await this.getOrCreateProgram(tenantId);
    const links   = await this.listLinks(tenantId);
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT status, SUM(commission_amount) AS total, COUNT(*) AS cnt
       FROM saas_affiliate_commissions WHERE tenant_id=$1 GROUP BY status`,
      [tenantId],
    );
    let pending = 0, approved = 0, paid = 0, totalConversions = 0;
    for (const r of rows) {
      if (r.status === "pending")  pending  = toNum(r.total);
      if (r.status === "approved") approved = toNum(r.total);
      if (r.status === "paid")     paid     = toNum(r.total);
      totalConversions += Number(r.cnt ?? 0);
    }
    return { program, links, pendingAmount: pending, approvedAmount: approved, paidAmount: paid, totalConversions };
  }
}

let _svc: SaasAffiliateService | undefined;
export function getSaasAffiliateService(): SaasAffiliateService {
  _svc ??= new SaasAffiliateService();
  return _svc;
}
export function resetSaasAffiliateServiceForTests(): void { _svc = undefined; }
