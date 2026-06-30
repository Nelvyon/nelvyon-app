/**
 * S52 — SaasPackStoreService
 * Self-serve pack catalog + per-tenant entitlements + 1-click launch gating.
 *
 * Catalog data lives in apps/web (servicePacksCatalog.ts). To keep this service
 * pure and testable, the catalog is injected via PackCatalogPort; the production
 * singleton lazily imports the real catalog, while tests pass a fixture.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Catalog port ────────────────────────────────────────────────────────────────

export type PackCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  availability: "available" | "beta" | "coming_soon";
  outputs: string[];
  estimatedMinutes: number;
  launchPackId?: string;
};

export type PackCatalogPort = {
  getCatalog(): Promise<PackCatalogEntry[]>;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type EntitlementSource = "plan" | "purchase" | "promo" | "admin";
export type EntitlementStatus = "active" | "expired" | "revoked";

export type PackEntitlement = {
  id: string;
  tenantId: string;
  packId: string;
  source: EntitlementSource;
  status: EntitlementStatus;
  launchesRemaining: number | null; // null = unlimited
  launchesUsed: number;
  stripePaymentIntentId: string | null;
  metadata: Record<string, unknown>;
  grantedAt: string;
  expiresAt: string | null;
  updatedAt: string;
};

export type PackStoreAccess = "included" | "owned" | "purchasable" | "coming_soon";

export type PackStoreItem = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  availability: "available" | "beta" | "coming_soon";
  outputs: string[];
  estimatedMinutes: number;
  launchPackId: string | null;
  access: PackStoreAccess;
  owned: boolean;
  launchesRemaining: number | null;
  canLaunch: boolean;
};

export type StoreSummary = {
  totalPacks: number;
  available: number;
  owned: number;
  launchesRemaining: number | null; // null = at least one unlimited entitlement
};

export type PurchasePackInput = {
  promoCode?: string;
  stripePaymentIntentId?: string;
};

export type SaasPackStoreErrorCode = "NOT_FOUND" | "VALIDATION" | "PACK_LOCKED";

export class SaasPackStoreError extends Error {
  constructor(
    public readonly code: SaasPackStoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SaasPackStoreError";
  }
}

// ── Plan defaults (v1 hardcoded) ─────────────────────────────────────────────────

const LOCAL = "local-business-growth";
const ECOM = "ecommerce-growth";
const SAAS_B2B = "saas-b2b-growth";
const SOCIAL = "social-calendar-pack";
const CONTENT = "content-strategy-pack";
const CRO = "cro-audit-pack";
const ANALYTICS = "analytics-setup-pack";
const BRAND = "brand-voice-pack";

/** Packs + monthly launch quota included per plan. null quota = unlimited. */
const PLAN_DEFAULTS: Record<string, Record<string, number | null>> = {
  starter: { [LOCAL]: 1 },
  pro: {
    [LOCAL]: 2,
    [ECOM]: 2,
    [SAAS_B2B]: 2,
    [SOCIAL]: 2,
    [CONTENT]: 2,
    [CRO]: 1,
    [ANALYTICS]: 1,
    [BRAND]: 1,
  },
  agency: {
    [LOCAL]: null,
    [ECOM]: null,
    [SAAS_B2B]: null,
    [SOCIAL]: null,
    [CONTENT]: null,
    [CRO]: null,
    [ANALYTICS]: null,
    [BRAND]: null,
  },
};

// ── Row mapping ──────────────────────────────────────────────────────────────────

type EntitlementRow = {
  id: string;
  tenant_id: string;
  pack_id: string;
  source: EntitlementSource;
  status: EntitlementStatus;
  launches_remaining: number | null;
  launches_used: number;
  stripe_payment_intent_id: string | null;
  metadata: Record<string, unknown>;
  granted_at: string;
  expires_at: string | null;
  updated_at: string;
};

function rowToEntitlement(r: EntitlementRow): PackEntitlement {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    packId: r.pack_id,
    source: r.source,
    status: r.status,
    launchesRemaining: r.launches_remaining,
    launchesUsed: r.launches_used,
    stripePaymentIntentId: r.stripe_payment_intent_id,
    metadata: r.metadata ?? {},
    grantedAt: r.granted_at,
    expiresAt: r.expires_at,
    updatedAt: r.updated_at,
  };
}

// ── Default catalog port (lazy import of apps/web catalog) ────────────────────────

const defaultCatalogPort: PackCatalogPort = {
  async getCatalog() {
    const mod = (await import("../../apps/web/src/lib/saas/servicePacksCatalog")) as {
      SERVICE_PACK_CATALOG: PackCatalogEntry[];
    };
    return mod.SERVICE_PACK_CATALOG.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      category: p.category,
      availability: p.availability,
      outputs: p.outputs ?? [],
      estimatedMinutes: p.estimatedMinutes,
      launchPackId: p.launchPackId,
    }));
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: SaasPackStoreService | null = null;

export function getSaasPackStoreService(): SaasPackStoreService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as {
      DbClient: { getInstance(): SaasPostgresPort };
    };
    _instance = new SaasPackStoreService(DbClient.getInstance(), defaultCatalogPort);
  }
  return _instance;
}

export function resetSaasPackStoreServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class SaasPackStoreService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly catalog: PackCatalogPort = defaultCatalogPort,
  ) {}

  // ── Entitlements ───────────────────────────────────────────────────────────

  async listEntitlements(tenantId: string): Promise<PackEntitlement[]> {
    const rows = await this.db.query<EntitlementRow>(
      `SELECT * FROM saas_pack_entitlements
       WHERE tenant_id = $1 AND status = 'active'
       ORDER BY granted_at DESC`,
      [tenantId],
    );
    return rows.map(rowToEntitlement);
  }

  private async getActiveEntitlement(
    tenantId: string,
    packId: string,
  ): Promise<PackEntitlement | null> {
    const rows = await this.db.query<EntitlementRow>(
      `SELECT * FROM saas_pack_entitlements
       WHERE tenant_id = $1 AND pack_id = $2 AND status = 'active'
       LIMIT 1`,
      [tenantId, packId],
    );
    return rows[0] ? rowToEntitlement(rows[0]) : null;
  }

  /** Resolve the tenant's plan from saas_tenants. */
  private async getPlan(tenantId: string): Promise<string> {
    const rows = await this.db.query<{ plan: string | null }>(
      `SELECT plan FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    return (rows[0]?.plan ?? "starter").toLowerCase();
  }

  /** Grant (UPSERT) the entitlements included in the tenant's current plan. */
  async grantFromPlan(tenantId: string): Promise<PackEntitlement[]> {
    const plan = await this.getPlan(tenantId);
    const defaults = PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.starter;
    const granted: PackEntitlement[] = [];

    for (const [packId, quota] of Object.entries(defaults)) {
      const rows = await this.db.query<EntitlementRow>(
        `INSERT INTO saas_pack_entitlements
           (tenant_id, pack_id, source, status, launches_remaining)
         VALUES ($1, $2, 'plan', 'active', $3)
         ON CONFLICT (tenant_id, pack_id) WHERE status = 'active'
         DO UPDATE SET launches_remaining = EXCLUDED.launches_remaining,
                       source = 'plan',
                       updated_at = NOW()
         RETURNING *`,
        [tenantId, packId, quota],
      );
      if (rows[0]) granted.push(rowToEntitlement(rows[0]));
    }
    return granted;
  }

  private async getEntitlementForPack(
    tenantId: string,
    packId: string,
  ): Promise<{ entitlement: PackEntitlement | null; consumePackId: string }> {
    const direct = await this.getActiveEntitlement(tenantId, packId);
    if (direct) return { entitlement: direct, consumePackId: packId };

    const catalog = await this.catalog.getCatalog();
    const entry = catalog.find((c) => c.id === packId);
    const launchKey = entry?.launchPackId;
    if (launchKey && launchKey !== packId) {
      const inherited = await this.getActiveEntitlement(tenantId, launchKey);
      if (inherited) return { entitlement: inherited, consumePackId: launchKey };
    }
    return { entitlement: null, consumePackId: packId };
  }

  /** Whether the tenant may launch a pack right now. */
  async canLaunch(
    tenantId: string,
    packId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const { entitlement: ent } = await this.getEntitlementForPack(tenantId, packId);
    if (!ent) return { allowed: false, reason: "PACK_LOCKED" };
    if (ent.launchesRemaining !== null && ent.launchesRemaining <= 0) {
      return { allowed: false, reason: "QUOTA_EXHAUSTED" };
    }
    return { allowed: true };
  }

  /** Increment usage after a launch (decrements remaining unless unlimited). */
  async consumeLaunch(tenantId: string, packId: string): Promise<void> {
    const { consumePackId } = await this.getEntitlementForPack(tenantId, packId);
    await this.db.query(
      `UPDATE saas_pack_entitlements
       SET launches_used = launches_used + 1,
           launches_remaining = CASE
             WHEN launches_remaining IS NULL THEN NULL
             ELSE GREATEST(launches_remaining - 1, 0)
           END,
           updated_at = NOW()
       WHERE tenant_id = $1 AND pack_id = $2 AND status = 'active'`,
      [tenantId, consumePackId],
    );
  }

  /** Record a paid (or promo) purchase — upserts an active entitlement. */
  async recordPurchase(
    tenantId: string,
    packId: string,
    input?: PurchasePackInput,
  ): Promise<PackEntitlement> {
    if (!packId?.trim()) {
      throw new SaasPackStoreError("VALIDATION", "packId requerido");
    }
    const source: EntitlementSource = input?.promoCode ? "promo" : "purchase";
    const rows = await this.db.query<EntitlementRow>(
      `INSERT INTO saas_pack_entitlements
         (tenant_id, pack_id, source, status, launches_remaining, stripe_payment_intent_id, metadata)
       VALUES ($1, $2, $3, 'active', NULL, $4, $5::jsonb)
       ON CONFLICT (tenant_id, pack_id) WHERE status = 'active'
       DO UPDATE SET source = EXCLUDED.source,
                     launches_remaining = NULL,
                     stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
                     updated_at = NOW()
       RETURNING *`,
      [
        tenantId,
        packId,
        source,
        input?.stripePaymentIntentId ?? null,
        JSON.stringify(input?.promoCode ? { promoCode: input.promoCode } : {}),
      ],
    );
    return rowToEntitlement(rows[0]!);
  }

  async revokeEntitlement(
    tenantId: string,
    packId: string,
    reason?: string,
  ): Promise<PackEntitlement> {
    const rows = await this.db.query<EntitlementRow>(
      `UPDATE saas_pack_entitlements
       SET status = 'revoked',
           metadata = metadata || $3::jsonb,
           updated_at = NOW()
       WHERE tenant_id = $1 AND pack_id = $2 AND status = 'active'
       RETURNING *`,
      [tenantId, packId, JSON.stringify(reason ? { revokeReason: reason } : {})],
    );
    if (!rows[0]) {
      throw new SaasPackStoreError("NOT_FOUND", `Sin entitlement activo para ${packId}`);
    }
    return rowToEntitlement(rows[0]);
  }

  // ── Catalog merge ───────────────────────────────────────────────────────────

  async getStoreCatalog(tenantId: string): Promise<PackStoreItem[]> {
    const [catalog, entitlements] = await Promise.all([
      this.catalog.getCatalog(),
      this.listEntitlements(tenantId),
    ]);
    const byPack = new Map(entitlements.map((e) => [e.packId, e]));
    const plan = await this.getPlan(tenantId);
    const planPacks = PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.starter;

    return catalog.map((c) => {
      const launchKey = c.launchPackId ?? c.id;
      const ent = byPack.get(c.id) ?? byPack.get(launchKey) ?? null;
      const includedInPlan = launchKey in planPacks;

      let access: PackStoreAccess;
      if (c.availability === "coming_soon") access = "coming_soon";
      else if (ent && ent.source === "purchase") access = "owned";
      else if (ent || includedInPlan) access = "included";
      else access = "purchasable";

      const launchesRemaining = ent?.launchesRemaining ?? null;
      const hasQuota = !ent || ent.launchesRemaining === null || ent.launchesRemaining > 0;
      const canLaunch = c.availability !== "coming_soon" && !!ent && hasQuota;

      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        category: c.category,
        availability: c.availability,
        outputs: c.outputs,
        estimatedMinutes: c.estimatedMinutes,
        launchPackId: c.launchPackId ?? null,
        access,
        owned: !!ent,
        launchesRemaining,
        canLaunch,
      };
    });
  }

  async getStoreSummary(tenantId: string): Promise<StoreSummary> {
    const items = await this.getStoreCatalog(tenantId);
    const owned = items.filter((i) => i.owned).length;
    const available = items.filter((i) => i.availability === "available").length;

    let launchesRemaining: number | null = 0;
    let hasUnlimited = false;
    for (const i of items) {
      if (!i.owned) continue;
      if (i.launchesRemaining === null) hasUnlimited = true;
      else launchesRemaining = (launchesRemaining ?? 0) + i.launchesRemaining;
    }

    return {
      totalPacks: items.length,
      available,
      owned,
      launchesRemaining: hasUnlimited ? null : launchesRemaining,
    };
  }

  /** Detail view: store item + recent launches for the pack. */
  async getPackDetail(
    tenantId: string,
    packId: string,
  ): Promise<{ item: PackStoreItem; canLaunch: { allowed: boolean; reason?: string }; recentLaunches: unknown[] }> {
    const items = await this.getStoreCatalog(tenantId);
    const item = items.find((i) => i.id === packId || i.launchPackId === packId);
    if (!item) {
      throw new SaasPackStoreError("NOT_FOUND", `Pack ${packId} no encontrado`);
    }
    const launchKey = item.launchPackId ?? item.id;
    const can = await this.canLaunch(tenantId, launchKey);
    const recentLaunches = await this.db.query(
      `SELECT id, status, progress_pct, pack_run_id, portal_url, created_at
       FROM saas_pack_launches
       WHERE tenant_id = $1 AND pack_id = $2
       ORDER BY created_at DESC
       LIMIT 5`,
      [tenantId, launchKey],
    );
    return { item, canLaunch: can, recentLaunches };
  }
}
