import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

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
  createdAt: string;
  updatedAt: string;
}

export type SaasWhiteLabelServiceDeps = {
  db?: Pick<DbClient, "query">;
};

export class SaasWhiteLabelService {
  constructor(private readonly deps: SaasWhiteLabelServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async getConfig(tenantId: string): Promise<WhiteLabelConfig | null> {
    const rows = await this.db.query<WhiteLabelConfig>(
      `SELECT id, tenant_id as "tenantId", agency_name as "agencyName",
              logo_url as "logoUrl", primary_color as "primaryColor",
              secondary_color as "secondaryColor", custom_domain as "customDomain",
              favicon_url as "faviconUrl", support_email as "supportEmail",
              footer_text as "footerText", hide_nelvyon_branding as "hideNelvyonBranding",
              active, created_at as "createdAt", updated_at as "updatedAt"
       FROM saas_whitelabel_configs WHERE tenant_id = $1`,
      [tenantId],
    );
    return rows[0] ?? null;
  }

  async upsertConfig(
    tenantId: string,
    data: Partial<Omit<WhiteLabelConfig, "id" | "tenantId" | "createdAt" | "updatedAt">>,
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
       RETURNING id, tenant_id as "tenantId", agency_name as "agencyName",
                 logo_url as "logoUrl", primary_color as "primaryColor",
                 secondary_color as "secondaryColor", custom_domain as "customDomain",
                 favicon_url as "faviconUrl", support_email as "supportEmail",
                 footer_text as "footerText", hide_nelvyon_branding as "hideNelvyonBranding",
                 active, created_at as "createdAt", updated_at as "updatedAt"`,
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
    logger.info(`[WHITELABEL] Config actualizada: tenant=${tenantId} agencia=${data.agencyName ?? ""}`);
    return row;
  }

  async getConfigByDomain(domain: string): Promise<WhiteLabelConfig | null> {
    const rows = await this.db.query<WhiteLabelConfig>(
      `SELECT id, tenant_id as "tenantId", agency_name as "agencyName",
              logo_url as "logoUrl", primary_color as "primaryColor",
              secondary_color as "secondaryColor", custom_domain as "customDomain",
              favicon_url as "faviconUrl", support_email as "supportEmail",
              footer_text as "footerText", hide_nelvyon_branding as "hideNelvyonBranding",
              active, created_at as "createdAt", updated_at as "updatedAt"
       FROM saas_whitelabel_configs WHERE custom_domain = $1 AND active = true`,
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
}

export const saasWhiteLabelService = new SaasWhiteLabelService();
