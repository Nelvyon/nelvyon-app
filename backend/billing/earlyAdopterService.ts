import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientSingleton } from "../db/DbClient";

export interface EarlyAdopterStatus {
  active: boolean;
  slotsLeft: number;
  expiresAt: string;
  maxSlots: number;
  discountPct: number;
}

interface ConfigRow {
  enabled: boolean;
  max_slots: number;
  used_slots: number;
  discount_pct: number;
  expires_at: string;
}

export class EarlyAdopterService {
  constructor(private readonly db: DbClient) {}

  static getInstance(): EarlyAdopterService {
    return new EarlyAdopterService(DbClientSingleton.getInstance());
  }

  getDiscountCode(): string | null {
    const code =
      process.env.STRIPE_EARLY_ADOPTER_COUPON_ID?.trim() ??
      process.env.STRIPE_EARLY_ADOPTER_PROMOTION_CODE?.trim() ??
      process.env.PADDLE_EARLY_ADOPTER_DISCOUNT_CODE?.trim();
    return code && code.length > 0 ? code : null;
  }

  async isEarlyAdopterActive(): Promise<boolean> {
    const cfg = await this.getConfig();
    if (!cfg) return false;
    return cfg.enabled && cfg.used_slots < cfg.max_slots && new Date() < new Date(cfg.expires_at);
  }

  async getEarlyAdopterStatus(): Promise<EarlyAdopterStatus> {
    const cfg = await this.getConfig();
    if (!cfg) {
      return {
        active: false,
        slotsLeft: 0,
        expiresAt: new Date(0).toISOString(),
        maxSlots: 200,
        discountPct: 40,
      };
    }

    const expiresAt = new Date(cfg.expires_at);
    const active =
      cfg.enabled && cfg.used_slots < cfg.max_slots && Date.now() < expiresAt.getTime();

    return {
      active,
      slotsLeft: Math.max(0, cfg.max_slots - cfg.used_slots),
      expiresAt: expiresAt.toISOString(),
      maxSlots: cfg.max_slots,
      discountPct: cfg.discount_pct,
    };
  }

  async claimEarlyAdopterSlot(userId: string): Promise<{ claimed: boolean; discountCode: string | null }> {
    if (!(await this.isEarlyAdopterActive())) {
      return { claimed: false, discountCode: null };
    }

    const existing = await this.db.query<{ is_early_adopter: boolean }>(
      `SELECT is_early_adopter FROM nelvyon_users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (existing[0]?.is_early_adopter) {
      return { claimed: true, discountCode: this.getDiscountCode() };
    }

    const slotRows = await this.db.query<{ used_slots: number }>(
      `UPDATE early_adopter_config
       SET used_slots = used_slots + 1
       WHERE id = 1
         AND enabled = true
         AND used_slots < max_slots
         AND now() < expires_at
       RETURNING used_slots`,
      [],
    );

    if (slotRows.length === 0) {
      return { claimed: false, discountCode: null };
    }

    await this.db.query(
      `UPDATE nelvyon_users SET is_early_adopter = true, updated_at = now() WHERE user_id = $1`,
      [userId],
    );

    return { claimed: true, discountCode: this.getDiscountCode() };
  }

  private async getConfig(): Promise<ConfigRow | null> {
    const rows = await this.db.query<ConfigRow>(
      `SELECT enabled, max_slots, used_slots, discount_pct, expires_at::text AS expires_at
       FROM early_adopter_config
       WHERE id = 1
       LIMIT 1`,
      [],
    );
    return rows[0] ?? null;
  }
}

/** Precio mensual con descuento early adopter (redondeo al entero más cercano). */
export function discountedMonthlyPrice(basePrice: number, discountPct: number): number {
  return Math.round(basePrice * (1 - discountPct / 100));
}
