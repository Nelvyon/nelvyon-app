/**
 * S54 — SaasPartnerZoneService
 * Unified agency HQ: wholesale→retail catalog, subaccounts, Stripe Connect and
 * rebilling ledger in one place. Delegates to existing services via injectable
 * ports so the orchestration stays testable without a live DB.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Ports (delegate to existing services) ───────────────────────────────────────

export type ConnectStatus = {
  connected: boolean;
  accountId: string | null;
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardedAt: string | null;
};

export type SubcuentasPort = {
  list(agencyTenantId: string, status?: string): Promise<Array<{ id: string; name?: string; companyName?: string; status: string }>>;
};

export type WhiteLabelPort = {
  getStripeConnectStatus(tenantId: string): Promise<ConnectStatus>;
  createStripeConnectAccount(tenantId: string, email: string, businessName: string): Promise<{ accountId: string }>;
  getStripeConnectOnboardingUrl(tenantId: string, returnUrl: string, refreshUrl: string): Promise<{ url: string }>;
};

export type PartnersPort = {
  getPartner(userId: string): Promise<{ id: string; referralCode: string } | null>;
  registerPartner(userId: string, tenantId: string): Promise<{ id: string; referralCode: string }>;
  getReferrals(partnerId: string): Promise<Array<Record<string, unknown>>>;
};

export type PartnerZonePorts = {
  subcuentas?: SubcuentasPort;
  whiteLabel?: WhiteLabelPort;
  partners?: PartnersPort;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type WholesaleSku = {
  sku: string;
  label: string;
  kind: "plan" | "pack";
  wholesaleEur: number;
  suggestedRetailEur: number;
  retailEur: number; // effective (override or suggested)
  marginEur: number;
  marginPct: number;
  hasOverride: boolean;
};

export type RetailPriceOverride = {
  sku: string;
  wholesaleEur: number;
  retailEur: number;
  currency: string;
  active: boolean;
  updatedAt: string;
};

export type LedgerEntry = {
  source: "connect" | "partner";
  grossEur: number;
  wholesaleEur: number;
  marginEur: number;
  currency: string;
  status: string | null;
  description: string | null;
  createdAt: string;
};

export type LedgerTotals = { gross: number; wholesale: number; margin: number };

export type PartnerEligibility = {
  eligible: boolean;
  plan: string;
  reason: "plan" | "partner_row" | "not_eligible";
};

export type PartnerZoneSummary = {
  eligible: boolean;
  plan: string;
  subcuentasActive: number;
  recentSubcuentas: Array<{ id: string; name: string; status: string }>;
  marginTotal: number;
  grossTotal: number;
  connect: ConnectStatus;
  referralCode: string | null;
};

export type SaasPartnerZoneErrorCode = "VALIDATION" | "PARTNER_REQUIRED" | "NOT_FOUND" | "NOT_CONNECTED";

export class SaasPartnerZoneError extends Error {
  constructor(
    public readonly code: SaasPartnerZoneErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SaasPartnerZoneError";
  }
}

// ── Wholesale catalog (v1 hardcoded) ─────────────────────────────────────────────

type CatalogEntry = { sku: string; label: string; kind: "plan" | "pack"; wholesaleEur: number; suggestedRetailEur: number };

export const WHOLESALE_CATALOG: readonly CatalogEntry[] = [
  { sku: "plan_starter", label: "Plan Starter", kind: "plan", wholesaleEur: 29, suggestedRetailEur: 79 },
  { sku: "plan_pro", label: "Plan Pro", kind: "plan", wholesaleEur: 79, suggestedRetailEur: 199 },
  { sku: "plan_agency", label: "Plan Agency", kind: "plan", wholesaleEur: 197, suggestedRetailEur: 497 },
  { sku: "pack_local_growth", label: "Pack Crecimiento Local", kind: "pack", wholesaleEur: 49, suggestedRetailEur: 149 },
  { sku: "pack_ecommerce", label: "Pack Crecimiento Ecommerce", kind: "pack", wholesaleEur: 49, suggestedRetailEur: 149 },
  { sku: "pack_saas_b2b", label: "Pack Crecimiento SaaS B2B", kind: "pack", wholesaleEur: 49, suggestedRetailEur: 149 },
] as const;

const ELIGIBLE_PLANS = new Set(["agency", "agency_partner"]);

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: SaasPartnerZoneService | null = null;

export function getSaasPartnerZoneService(): SaasPartnerZoneService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    const ports: PartnerZonePorts = {
      get subcuentas() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSaasSubcuentasService } = require("./SaasSubcuentasService") as { getSaasSubcuentasService: () => SubcuentasPort };
        return getSaasSubcuentasService();
      },
      get whiteLabel() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSaasWhiteLabelService } = require("./SaasWhiteLabelService") as { getSaasWhiteLabelService: () => WhiteLabelPort };
        return getSaasWhiteLabelService();
      },
      get partners() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SaasPartnersService } = require("./SaasPartnersService") as { SaasPartnersService: new () => PartnersPort };
        return new SaasPartnersService();
      },
    };
    _instance = new SaasPartnerZoneService(DbClient.getInstance(), ports);
  }
  return _instance;
}

export function resetSaasPartnerZoneServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class SaasPartnerZoneService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly ports: PartnerZonePorts = {},
  ) {}

  private async getPlan(tenantId: string): Promise<string> {
    const rows = await this.db.query<{ plan: string | null }>(
      `SELECT plan FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    return (rows[0]?.plan ?? "starter").toLowerCase();
  }

  // ── Eligibility ──────────────────────────────────────────────────────────────

  async getPartnerEligibility(tenantId: string): Promise<PartnerEligibility> {
    const plan = await this.getPlan(tenantId);
    if (ELIGIBLE_PLANS.has(plan)) return { eligible: true, plan, reason: "plan" };
    return { eligible: false, plan, reason: "not_eligible" };
  }

  private async assertEligible(tenantId: string): Promise<string> {
    const elig = await this.getPartnerEligibility(tenantId);
    if (!elig.eligible) {
      throw new SaasPartnerZoneError("PARTNER_REQUIRED", "Requiere plan Agency o Agency Partner");
    }
    return elig.plan;
  }

  // ── Wholesale catalog ────────────────────────────────────────────────────────

  async getWholesaleCatalog(tenantId: string): Promise<WholesaleSku[]> {
    let overrides: RetailPriceOverride[] = [];
    try {
      const rows = await this.db.query<{
        sku: string; wholesale_eur: string; retail_eur: string; currency: string; active: boolean; updated_at: string;
      }>(
        `SELECT sku, wholesale_eur, retail_eur, currency, active, updated_at
         FROM saas_partner_retail_prices
         WHERE agency_tenant_id = $1`,
        [tenantId],
      );
      overrides = rows.map((r) => ({
        sku: r.sku,
        wholesaleEur: parseFloat(r.wholesale_eur),
        retailEur: parseFloat(r.retail_eur),
        currency: r.currency,
        active: r.active,
        updatedAt: r.updated_at,
      }));
    } catch { /* table missing — use catalog defaults */ }

    const bySku = new Map(overrides.map((o) => [o.sku, o]));

    return WHOLESALE_CATALOG.map((c) => {
      const ov = bySku.get(c.sku);
      const retail = ov ? ov.retailEur : c.suggestedRetailEur;
      const margin = round2(retail - c.wholesaleEur);
      const marginPct = retail > 0 ? Math.round((margin / retail) * 100) : 0;
      return {
        sku: c.sku,
        label: c.label,
        kind: c.kind,
        wholesaleEur: c.wholesaleEur,
        suggestedRetailEur: c.suggestedRetailEur,
        retailEur: retail,
        marginEur: margin,
        marginPct,
        hasOverride: !!ov,
      };
    });
  }

  async upsertRetailPrice(tenantId: string, sku: string, retailEur: number): Promise<WholesaleSku> {
    const entry = WHOLESALE_CATALOG.find((c) => c.sku === sku);
    if (!entry) throw new SaasPartnerZoneError("NOT_FOUND", `SKU ${sku} no encontrado`);
    if (!Number.isFinite(retailEur) || retailEur < entry.wholesaleEur) {
      throw new SaasPartnerZoneError(
        "VALIDATION",
        `El precio retail (${retailEur}) no puede ser inferior al wholesale (${entry.wholesaleEur})`,
      );
    }
    await this.db.query(
      `INSERT INTO saas_partner_retail_prices (agency_tenant_id, sku, wholesale_eur, retail_eur)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (agency_tenant_id, sku)
       DO UPDATE SET retail_eur = EXCLUDED.retail_eur,
                     wholesale_eur = EXCLUDED.wholesale_eur,
                     active = true,
                     updated_at = NOW()`,
      [tenantId, sku, entry.wholesaleEur, round2(retailEur)],
    );
    const catalog = await this.getWholesaleCatalog(tenantId);
    return catalog.find((c) => c.sku === sku)!;
  }

  // ── Ledger ───────────────────────────────────────────────────────────────────

  async listLedger(tenantId: string, limit = 50): Promise<{ entries: LedgerEntry[]; totals: LedgerTotals }> {
    const entries: LedgerEntry[] = [];

    // Agency rebilling (tenant-scoped)
    try {
      const rows = await this.db.query<{
        gross_amount_eur: string; net_agency_eur: string; status: string | null; description: string | null; created_at: string;
      }>(
        `SELECT gross_amount_eur, net_agency_eur, status, description, created_at
         FROM saas_connect_rebilling
         WHERE agency_tenant_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [tenantId, limit],
      );
      for (const r of rows) {
        const gross = parseFloat(r.gross_amount_eur) || 0;
        const margin = parseFloat(r.net_agency_eur) || 0;
        entries.push({
          source: "connect",
          grossEur: gross,
          wholesaleEur: round2(gross - margin),
          marginEur: margin,
          currency: "eur",
          status: r.status,
          description: r.description,
          createdAt: r.created_at,
        });
      }
    } catch { /* table missing */ }

    // Partner rebilling ledger (via workspace bridge)
    try {
      const rows = await this.db.query<{
        gross_eur: string; wholesale_eur: string; partner_margin_eur: string; currency: string; description: string | null; created_at: string;
      }>(
        `SELECT l.gross_eur, l.wholesale_eur, l.partner_margin_eur, l.currency, l.description, l.created_at
         FROM partner_rebilling_ledger l
         JOIN saas_tenants t ON t.workspace_id = l.partner_workspace_id
         WHERE t.id = $1
         ORDER BY l.created_at DESC
         LIMIT $2`,
        [tenantId, limit],
      );
      for (const r of rows) {
        entries.push({
          source: "partner",
          grossEur: parseFloat(r.gross_eur) || 0,
          wholesaleEur: parseFloat(r.wholesale_eur) || 0,
          marginEur: parseFloat(r.partner_margin_eur) || 0,
          currency: r.currency ?? "eur",
          status: null,
          description: r.description,
          createdAt: r.created_at,
        });
      }
    } catch { /* table missing */ }

    entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const sliced = entries.slice(0, limit);
    const totals = sliced.reduce<LedgerTotals>(
      (acc, e) => ({
        gross: round2(acc.gross + e.grossEur),
        wholesale: round2(acc.wholesale + e.wholesaleEur),
        margin: round2(acc.margin + e.marginEur),
      }),
      { gross: 0, wholesale: 0, margin: 0 },
    );
    return { entries: sliced, totals };
  }

  // ── Connect / referrals delegates ──────────────────────────────────────────────

  async getConnectStatus(tenantId: string): Promise<ConnectStatus> {
    if (!this.ports.whiteLabel) {
      return { connected: false, accountId: null, status: "not_connected", chargesEnabled: false, payoutsEnabled: false, onboardedAt: null };
    }
    return this.ports.whiteLabel.getStripeConnectStatus(tenantId);
  }

  async startConnectOnboarding(
    tenantId: string,
    opts: { email: string; businessName: string; returnUrl: string; refreshUrl: string },
  ): Promise<{ url: string }> {
    await this.assertEligible(tenantId);
    if (!this.ports.whiteLabel) {
      throw new SaasPartnerZoneError("NOT_CONNECTED", "Stripe Connect no disponible");
    }
    await this.ports.whiteLabel.createStripeConnectAccount(tenantId, opts.email, opts.businessName);
    return this.ports.whiteLabel.getStripeConnectOnboardingUrl(tenantId, opts.returnUrl, opts.refreshUrl);
  }

  async getReferralStats(
    tenantId: string,
    userId: string,
  ): Promise<{ partner: { id: string; referralCode: string }; referrals: Array<Record<string, unknown>> }> {
    if (!this.ports.partners) throw new SaasPartnerZoneError("NOT_FOUND", "Programa de partners no disponible");
    const partner = await this.ports.partners.getPartner(userId);
    if (!partner) throw new SaasPartnerZoneError("NOT_FOUND", "No estás registrado como partner");
    const referrals = await this.ports.partners.getReferrals(partner.id);
    return { partner, referrals };
  }

  async registerAsPartner(userId: string, tenantId: string): Promise<{ id: string; referralCode: string }> {
    if (!this.ports.partners) throw new SaasPartnerZoneError("NOT_FOUND", "Programa de partners no disponible");
    const existing = await this.ports.partners.getPartner(userId);
    if (existing) return existing;
    return this.ports.partners.registerPartner(userId, tenantId);
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  async getZoneSummary(tenantId: string, userId?: string): Promise<PartnerZoneSummary> {
    const elig = await this.getPartnerEligibility(tenantId);

    let recentSubcuentas: Array<{ id: string; name: string; status: string }> = [];
    let subcuentasActive = 0;
    if (this.ports.subcuentas) {
      try {
        const all = await this.ports.subcuentas.list(tenantId);
        subcuentasActive = all.filter((s) => s.status === "active").length;
        recentSubcuentas = all.slice(0, 5).map((s) => ({
          id: s.id,
          name: s.name ?? s.companyName ?? s.id,
          status: s.status,
        }));
      } catch { /* leave empty */ }
    }

    const connect = await this.getConnectStatus(tenantId);
    const { totals } = await this.listLedger(tenantId, 200);

    let referralCode: string | null = null;
    if (userId && this.ports.partners) {
      try {
        const partner = await this.ports.partners.getPartner(userId);
        referralCode = partner?.referralCode ?? null;
      } catch { /* ignore */ }
    }

    return {
      eligible: elig.eligible,
      plan: elig.plan,
      subcuentasActive,
      recentSubcuentas,
      marginTotal: totals.margin,
      grossTotal: totals.gross,
      connect,
      referralCode,
    };
  }
}
