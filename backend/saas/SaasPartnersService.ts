import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export interface Partner {
  id: string;
  userId: string;
  tenantId: string;
  referralCode: string;
  commissionRate: number;
  totalReferrals: number;
  totalEarningsEur: number;
  pendingEarningsEur: number;
  status: "active" | "suspended";
  createdAt: string;
}

export interface PartnerReferral {
  id: string;
  partnerId: string;
  referredUserId: string;
  commissionEur: number;
  status: "pending" | "paid";
  createdAt: string;
}

export type SaasPartnersServiceDeps = {
  db?: Pick<DbClient, "query">;
};

function buildReferralCode(userId: string): string {
  const userPart = userId.slice(0, 8).toUpperCase().padEnd(8, "X");
  const tsPart = Date.now().toString(36).toUpperCase().slice(-5).padStart(5, "0");
  return `NEL-${userPart}-${tsPart}`;
}

export class SaasPartnersService {
  constructor(private readonly deps: SaasPartnersServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async registerPartner(userId: string, tenantId: string): Promise<Partner> {
    const existing = await this.db.query<{ id: string }>(`SELECT id FROM saas_partners WHERE user_id = $1`, [userId]);
    if (existing.length > 0) throw new Error("Ya eres partner de NELVYON");

    const referralCode = buildReferralCode(userId);
    const rows = await this.db.query<Partner>(
      `INSERT INTO saas_partners (user_id, tenant_id, referral_code, commission_rate)
       VALUES ($1, $2, $3, 0.30)
       RETURNING id, user_id as "userId", tenant_id as "tenantId",
                 referral_code as "referralCode", commission_rate as "commissionRate",
                 total_referrals as "totalReferrals", total_earnings_eur as "totalEarningsEur",
                 pending_earnings_eur as "pendingEarningsEur", status, created_at as "createdAt"`,
      [userId, tenantId, referralCode],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasPartnersService.registerPartner: INSERT returned no row");
    logger.info(`[PARTNERS] Nuevo partner: ${userId} código=${referralCode}`);
    return row;
  }

  async getPartner(userId: string): Promise<Partner | null> {
    const rows = await this.db.query<Partner>(
      `SELECT id, user_id as "userId", tenant_id as "tenantId",
              referral_code as "referralCode", commission_rate as "commissionRate",
              total_referrals as "totalReferrals", total_earnings_eur as "totalEarningsEur",
              pending_earnings_eur as "pendingEarningsEur", status, created_at as "createdAt"
       FROM saas_partners WHERE user_id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async registerReferral(referralCode: string, referredUserId: string, invoiceAmountEur: number): Promise<PartnerReferral | null> {
    const partners = await this.db.query<{ id: string; commission_rate: number }>(
      `SELECT id, commission_rate FROM saas_partners WHERE referral_code = $1 AND status = 'active'`,
      [referralCode],
    );
    if (partners.length === 0) return null;

    const partner = partners[0];
    const commissionEur = invoiceAmountEur * partner.commission_rate;

    const rows = await this.db.query<PartnerReferral>(
      `INSERT INTO saas_partner_referrals (partner_id, referred_user_id, commission_eur)
       VALUES ($1, $2, $3)
       RETURNING id, partner_id as "partnerId", referred_user_id as "referredUserId",
                 commission_eur as "commissionEur", status, created_at as "createdAt"`,
      [partner.id, referredUserId, commissionEur],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasPartnersService.registerReferral: INSERT returned no row");

    await this.db.query(
      `UPDATE saas_partners SET
         total_referrals = total_referrals + 1,
         total_earnings_eur = total_earnings_eur + $1,
         pending_earnings_eur = pending_earnings_eur + $1
       WHERE id = $2`,
      [commissionEur, partner.id],
    );

    logger.info(`[PARTNERS] Referido registrado: ${referredUserId} comisión=${commissionEur}€`);
    return row;
  }

  async getReferrals(partnerId: string): Promise<PartnerReferral[]> {
    return this.db.query<PartnerReferral>(
      `SELECT id, partner_id as "partnerId", referred_user_id as "referredUserId",
              commission_eur as "commissionEur", status, created_at as "createdAt"
       FROM saas_partner_referrals WHERE partner_id = $1 ORDER BY created_at DESC`,
      [partnerId],
    );
  }
}

export const saasPartnersService = new SaasPartnersService();
