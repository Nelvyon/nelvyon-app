import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export type StripeConnectStatus = "not_connected" | "pending" | "active" | "restricted";

export interface WhiteLabelConfig {
  id: string;
  tenantId: string;
  agencyName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  faviconUrl: string | null;
  supportEmail: string | null;
  footerText: string | null;
  hideNelvyonBranding: boolean;
  active: boolean;
  stripeConnectAccountId: string | null;
  stripeConnectStatus: StripeConnectStatus;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeConnectOnboardedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StripeConnectStatusResult {
  connected: boolean;
  accountId: string | null;
  status: StripeConnectStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardedAt: string | null;
}

export type SaasWhiteLabelServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

const SELECT_COLS = `
  id, tenant_id as "tenantId", agency_name as "agencyName",
  logo_url as "logoUrl", primary_color as "primaryColor",
  secondary_color as "secondaryColor", custom_domain as "customDomain",
  favicon_url as "faviconUrl", support_email as "supportEmail",
  footer_text as "footerText", hide_nelvyon_branding as "hideNelvyonBranding",
  active,
  stripe_connect_account_id as "stripeConnectAccountId",
  COALESCE(stripe_connect_status, 'not_connected') as "stripeConnectStatus",
  COALESCE(stripe_charges_enabled, false) as "stripeChargesEnabled",
  COALESCE(stripe_payouts_enabled, false) as "stripePayoutsEnabled",
  stripe_connect_onboarded_at as "stripeConnectOnboardedAt",
  created_at as "createdAt", updated_at as "updatedAt"
`;

export class SaasWhiteLabelService {
  constructor(private readonly deps: SaasWhiteLabelServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetch(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch;
  }

  private async stripeRequest<T>(method: string, path: string, body?: Record<string, string>): Promise<T> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw Object.assign(new Error("STRIPE_SECRET_KEY not configured"), { code: "NOT_CONFIGURED" });
    const res = await this.fetch(`https://api.stripe.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body ? new URLSearchParams(body).toString() : undefined,
    });
    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      const msg = (data.error as { message?: string } | undefined)?.message ?? "Stripe error";
      throw Object.assign(new Error(msg), { code: "STRIPE_ERROR", status: res.status });
    }
    return data as T;
  }

  async getConfig(tenantId: string): Promise<WhiteLabelConfig | null> {
    const rows = await this.db.query<WhiteLabelConfig>(
      `SELECT ${SELECT_COLS} FROM saas_whitelabel_configs WHERE tenant_id = $1`,
      [tenantId],
    );
    return rows[0] ?? null;
  }

  async upsertConfig(
    tenantId: string,
    data: Partial<Omit<WhiteLabelConfig, "id" | "tenantId" | "createdAt" | "updatedAt" | "stripeConnectAccountId" | "stripeConnectStatus" | "stripeChargesEnabled" | "stripePayoutsEnabled" | "stripeConnectOnboardedAt">>,
  ): Promise<WhiteLabelConfig> {
    const rows = await this.db.query<WhiteLabelConfig>(
      `INSERT INTO saas_whitelabel_configs
         (tenant_id, agency_name, logo_url, primary_color, secondary_color,
          custom_domain, favicon_url, support_email, footer_text, hide_nelvyon_branding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (tenant_id) DO UPDATE SET
         agency_name = COALESCE(EXCLUDED.agency_name, saas_whitelabel_configs.agency_name),
         logo_url = COALESCE(EXCLUDED.logo_url, saas_whitelabel_configs.logo_url),
         primary_color = COALESCE(EXCLUDED.primary_color, saas_whitelabel_configs.primary_color),
         secondary_color = COALESCE(EXCLUDED.secondary_color, saas_whitelabel_configs.secondary_color),
         custom_domain = COALESCE(EXCLUDED.custom_domain, saas_whitelabel_configs.custom_domain),
         favicon_url = COALESCE(EXCLUDED.favicon_url, saas_whitelabel_configs.favicon_url),
         support_email = COALESCE(EXCLUDED.support_email, saas_whitelabel_configs.support_email),
         footer_text = COALESCE(EXCLUDED.footer_text, saas_whitelabel_configs.footer_text),
         hide_nelvyon_branding = COALESCE(EXCLUDED.hide_nelvyon_branding, saas_whitelabel_configs.hide_nelvyon_branding),
         updated_at = NOW()
       RETURNING ${SELECT_COLS}`,
      [
        tenantId,
        data.agencyName ?? null,
        data.logoUrl ?? null,
        data.primaryColor ?? "#6366f1",
        data.secondaryColor ?? "#8b5cf6",
        data.customDomain ?? null,
        data.faviconUrl ?? null,
        data.supportEmail ?? null,
        data.footerText ?? null,
        data.hideNelvyonBranding ?? false,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasWhiteLabelService.upsertConfig: upsert returned no row");
    logger.info(`[WHITELABEL] Config actualizada: tenant=${tenantId}`);
    return row;
  }

  async getConfigByDomain(domain: string): Promise<WhiteLabelConfig | null> {
    const rows = await this.db.query<WhiteLabelConfig>(
      `SELECT ${SELECT_COLS} FROM saas_whitelabel_configs WHERE custom_domain = $1 AND active = true`,
      [domain],
    );
    return rows[0] ?? null;
  }

  async deactivate(tenantId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_whitelabel_configs SET active = false, updated_at = NOW()
       WHERE tenant_id = $1 RETURNING id`,
      [tenantId],
    );
    return rows.length > 0;
  }

  // ── Stripe Connect ────────────────────────────────────────────────────────

  async getStripeConnectStatus(tenantId: string): Promise<StripeConnectStatusResult> {
    const config = await this.getConfig(tenantId);
    if (!config?.stripeConnectAccountId) {
      return { connected: false, accountId: null, status: "not_connected", chargesEnabled: false, payoutsEnabled: false, onboardedAt: null };
    }
    return {
      connected: config.stripeConnectStatus === "active",
      accountId: config.stripeConnectAccountId,
      status: config.stripeConnectStatus,
      chargesEnabled: config.stripeChargesEnabled,
      payoutsEnabled: config.stripePayoutsEnabled,
      onboardedAt: config.stripeConnectOnboardedAt,
    };
  }

  async createStripeConnectAccount(tenantId: string, email: string, businessName: string): Promise<{ accountId: string }> {
    const existing = await this.getConfig(tenantId);
    if (existing?.stripeConnectAccountId) {
      return { accountId: existing.stripeConnectAccountId };
    }

    const account = await this.stripeRequest<{ id: string }>("POST", "/accounts", {
      type: "express",
      email,
      "business_profile[name]": businessName,
      "capabilities[card_payments][requested]": "true",
      "capabilities[transfers][requested]": "true",
    });

    await this.db.query(
      `INSERT INTO saas_whitelabel_configs
         (tenant_id, agency_name, stripe_connect_account_id, stripe_connect_status, primary_color, secondary_color)
       VALUES ($1, $2, $3, 'pending', '#6366f1', '#8b5cf6')
       ON CONFLICT (tenant_id) DO UPDATE SET
         stripe_connect_account_id = EXCLUDED.stripe_connect_account_id,
         stripe_connect_status = 'pending',
         updated_at = NOW()`,
      [tenantId, businessName, account.id],
    );

    logger.info(`[WHITELABEL] Stripe Connect account creada: ${account.id} para tenant=${tenantId}`);
    return { accountId: account.id };
  }

  async getStripeConnectOnboardingUrl(
    tenantId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<{ url: string }> {
    const config = await this.getConfig(tenantId);
    if (!config?.stripeConnectAccountId) {
      throw Object.assign(new Error("No Stripe Connect account. Call createStripeConnectAccount first."), { code: "NOT_CONNECTED" });
    }

    const link = await this.stripeRequest<{ url: string }>("POST", "/account_links", {
      account: config.stripeConnectAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return { url: link.url };
  }

  async syncStripeConnectStatus(tenantId: string): Promise<StripeConnectStatusResult> {
    const config = await this.getConfig(tenantId);
    if (!config?.stripeConnectAccountId) {
      return { connected: false, accountId: null, status: "not_connected", chargesEnabled: false, payoutsEnabled: false, onboardedAt: null };
    }

    const account = await this.stripeRequest<{
      charges_enabled: boolean;
      payouts_enabled: boolean;
      details_submitted: boolean;
    }>("GET", `/accounts/${config.stripeConnectAccountId}`);

    const status: StripeConnectStatus = account.charges_enabled
      ? "active"
      : account.details_submitted
      ? "restricted"
      : "pending";

    const onboardedAt = account.charges_enabled && !config.stripeConnectOnboardedAt
      ? new Date().toISOString()
      : config.stripeConnectOnboardedAt;

    await this.db.query(
      `UPDATE saas_whitelabel_configs SET
         stripe_connect_status   = $2,
         stripe_charges_enabled  = $3,
         stripe_payouts_enabled  = $4,
         stripe_connect_onboarded_at = $5,
         updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenantId, status, account.charges_enabled, account.payouts_enabled, onboardedAt],
    );

    logger.info(`[WHITELABEL] Stripe Connect sync: tenant=${tenantId} status=${status}`);
    return {
      connected: status === "active",
      accountId: config.stripeConnectAccountId,
      status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardedAt: onboardedAt ?? null,
    };
  }
}

let _svc: SaasWhiteLabelService | undefined;
export function getSaasWhiteLabelService(): SaasWhiteLabelService {
  if (!_svc) _svc = new SaasWhiteLabelService();
  return _svc;
}
export function resetSaasWhiteLabelServiceForTests(): void {
  _svc = undefined;
}

export const saasWhiteLabelService = new SaasWhiteLabelService();
