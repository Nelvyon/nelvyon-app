import { randomBytes } from "node:crypto";

import { DbClient } from "../db/DbClient";
import { createLogger } from "../logger";

export type AffiliateStatus = "active" | "paused" | "banned";
export type ConversionStatus = "pending" | "approved" | "paid";

export interface AffiliateProfile {
  id: string;
  userId: string;
  code: string;
  commissionRate: number;
  status: AffiliateStatus;
  totalClicks: number;
  totalConversions: number;
  totalEarned: number;
  pendingPayout: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionSummary {
  plan: string;
  amount: number;
  commission: number;
  status: ConversionStatus;
  createdAt: string;
}

export interface AffiliateStats {
  profile: AffiliateProfile;
  recentConversions: ConversionSummary[];
  affiliateLink: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  code: string;
  commission_rate: string | number;
  status: AffiliateStatus;
  total_clicks: number;
  total_conversions: number;
  total_earned: string | number;
  pending_payout: string | number;
  created_at: string;
  updated_at: string;
}

interface ConversionRow {
  plan: string;
  amount: string | number;
  commission: string | number;
  status: ConversionStatus;
  created_at: string;
}

function toNum(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(v);
}

function mapProfile(r: ProfileRow): AffiliateProfile {
  return {
    id: r.id,
    userId: r.user_id,
    code: r.code,
    commissionRate: toNum(r.commission_rate),
    status: r.status,
    totalClicks: r.total_clicks,
    totalConversions: r.total_conversions,
    totalEarned: toNum(r.total_earned),
    pendingPayout: toNum(r.pending_payout),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function generateAffiliateCode(): string {
  return `NEL${randomBytes(4).toString("hex").toUpperCase()}`;
}

function affiliateLinkFor(code: string): string {
  return `https://nelvyon.com/?ref=${code}`;
}

let inst: AffiliateService | undefined;

export class AffiliateService {
  private readonly db: DbClient;
  private readonly logger = createLogger("affiliates");

  private constructor() {
    this.db = DbClient.getInstance();
  }

  static instance(): AffiliateService {
    if (!inst) inst = new AffiliateService();
    return inst;
  }

  static reset(): void {
    inst = undefined;
  }

  async getOrCreateProfile(userId: string): Promise<AffiliateProfile> {
    const existing = await this.db.query<ProfileRow>(
      `SELECT * FROM affiliate_profiles WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (existing.length > 0) {
      return mapProfile(existing[0]!);
    }

    const code = generateAffiliateCode();
    const inserted = await this.db.query<ProfileRow>(
      `INSERT INTO affiliate_profiles (user_id, code)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, code],
    );
    this.logger.info("affiliate_profile_created", { userId, code });
    return mapProfile(inserted[0]!);
  }

  async trackClick(
    code: string,
    meta: { ipHash?: string; userAgent?: string; referrer?: string },
  ): Promise<void> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    const active = await this.db.query<{ id: string }>(
      `SELECT id FROM affiliate_profiles WHERE code = $1 AND status = 'active' LIMIT 1`,
      [normalized],
    );
    if (active.length === 0) return;

    await this.db.query(
      `INSERT INTO affiliate_clicks (code, ip_hash, user_agent, referrer)
       VALUES ($1, $2, $3, $4)`,
      [normalized, meta.ipHash ?? null, meta.userAgent ?? null, meta.referrer ?? null],
    );
    await this.db.query(
      `UPDATE affiliate_profiles
       SET total_clicks = total_clicks + 1, updated_at = now()
       WHERE code = $1`,
      [normalized],
    );
  }

  async trackConversion(
    code: string,
    data: { convertedUserId: string; plan: string; amount: number },
  ): Promise<void> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    const rows = await this.db.query<Pick<ProfileRow, "commission_rate">>(
      `SELECT commission_rate FROM affiliate_profiles WHERE code = $1 AND status = 'active' LIMIT 1`,
      [normalized],
    );
    if (rows.length === 0) return;

    const rate = toNum(rows[0]!.commission_rate);
    const commission = Math.round(data.amount * (rate / 100) * 100) / 100;

    await this.db.query(
      `INSERT INTO affiliate_conversions (code, converted_user_id, plan, amount, commission)
       VALUES ($1, $2, $3, $4, $5)`,
      [normalized, data.convertedUserId, data.plan, data.amount, commission],
    );
    await this.db.query(
      `UPDATE affiliate_profiles
       SET total_conversions = total_conversions + 1,
           total_earned = total_earned + $2,
           pending_payout = pending_payout + $2,
           updated_at = now()
       WHERE code = $1`,
      [normalized, commission],
    );
    this.logger.info("affiliate_conversion", {
      code: normalized,
      plan: data.plan,
      amount: data.amount,
      commission,
    });
  }

  async getStats(userId: string): Promise<AffiliateStats> {
    const profile = await this.getOrCreateProfile(userId);
    const convRows = await this.db.query<ConversionRow>(
      `SELECT plan, amount, commission, status, created_at
       FROM affiliate_conversions
       WHERE code = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [profile.code],
    );
    const recentConversions: ConversionSummary[] = convRows.map((r) => ({
      plan: r.plan,
      amount: toNum(r.amount),
      commission: toNum(r.commission),
      status: r.status,
      createdAt: r.created_at,
    }));
    return {
      profile,
      recentConversions,
      affiliateLink: affiliateLinkFor(profile.code),
    };
  }
}
