/**
 * S56 — SaasPwaService
 * Builds a per-tenant PWA manifest (white-label name/colors/icons), tracks
 * install events and reports install stats. White-label config is read through
 * an injectable port so the service stays testable without a live DB.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── White-label port ─────────────────────────────────────────────────────────────

export type WhiteLabelBranding = {
  agencyName: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
};

export type WhiteLabelPwaPort = {
  getConfig(tenantId: string): Promise<WhiteLabelBranding | null>;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type PwaIcon = { src: string; sizes: string; type: string; purpose?: string };

export type PwaManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  orientation: string;
  theme_color: string;
  background_color: string;
  icons: PwaIcon[];
  categories: string[];
  lang: string;
};

export type PwaInstallPlatform = "ios" | "android" | "desktop" | "unknown";

export type PwaInstallStats = {
  total: number;
  byPlatform: Record<string, number>;
  lastInstalledAt: string | null;
};

export type PwaStatus = {
  installable: boolean;
  scope: string;
  manifestUrl: string;
  fallbackManifestUrl: string;
  swUrl: string;
  offlineUrl: string;
  themeColor: string;
  backgroundColor: string;
  appName: string;
  whiteLabel: boolean;
  stats: PwaInstallStats;
};

export type SaasPwaErrorCode = "VALIDATION";

export class SaasPwaError extends Error {
  constructor(
    public readonly code: SaasPwaErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SaasPwaError";
  }
}

// ── Defaults ─────────────────────────────────────────────────────────────────────

const DEFAULT_THEME = "#0084ff";
const DEFAULT_BG = "#020817";
const DEFAULT_NAME = "Nelvyon SaaS";
const DEFAULT_SHORT = "Nelvyon";
const SCOPE = "/saas";
const START_URL = "/saas/dashboard";

const DEFAULT_ICONS: PwaIcon[] = [
  { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
  { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
  { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
  { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
  { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
  { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
  { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
  { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
];

function isValidHexColor(c: string | null | undefined): c is string {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c.trim());
}

// ── Default white-label port (lazy require) ───────────────────────────────────────

const defaultWhiteLabelPort: WhiteLabelPwaPort = {
  async getConfig(tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSaasWhiteLabelService } = require("./SaasWhiteLabelService") as {
      getSaasWhiteLabelService: () => { getConfig(t: string): Promise<WhiteLabelBranding | null> };
    };
    return getSaasWhiteLabelService().getConfig(tenantId);
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: SaasPwaService | null = null;

export function getSaasPwaService(): SaasPwaService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new SaasPwaService(DbClient.getInstance(), defaultWhiteLabelPort);
  }
  return _instance;
}

export function resetSaasPwaServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class SaasPwaService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly whiteLabel: WhiteLabelPwaPort = defaultWhiteLabelPort,
  ) {}

  private async getBranding(tenantId: string): Promise<WhiteLabelBranding | null> {
    try {
      return await this.whiteLabel.getConfig(tenantId);
    } catch {
      return null;
    }
  }

  /** Build a per-tenant manifest, falling back to Nelvyon defaults. */
  async buildManifest(tenantId: string): Promise<PwaManifest> {
    const wl = await this.getBranding(tenantId);
    const name = wl?.agencyName?.trim() || DEFAULT_NAME;
    const shortName = wl?.agencyName?.trim()?.split(/\s+/)[0] || DEFAULT_SHORT;
    const theme = isValidHexColor(wl?.primaryColor) ? wl!.primaryColor!.trim() : DEFAULT_THEME;

    const icons: PwaIcon[] = wl?.logoUrl
      ? [
          { src: wl.logoUrl, sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: wl.logoUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ...DEFAULT_ICONS,
        ]
      : DEFAULT_ICONS;

    return {
      name,
      short_name: shortName,
      description: "CRM, campañas y automatizaciones de marketing — operado por IA",
      start_url: START_URL,
      scope: SCOPE,
      display: "standalone",
      orientation: "portrait-primary",
      theme_color: theme,
      background_color: DEFAULT_BG,
      icons,
      categories: ["business", "productivity"],
      lang: "es",
    };
  }

  /** Install metadata + stats for the install hub. */
  async getStatus(tenantId: string): Promise<PwaStatus> {
    const wl = await this.getBranding(tenantId);
    const theme = isValidHexColor(wl?.primaryColor) ? wl!.primaryColor!.trim() : DEFAULT_THEME;
    const stats = await this.getInstallStats(tenantId);
    return {
      installable: true,
      scope: SCOPE,
      manifestUrl: "/api/saas/pwa/manifest",
      fallbackManifestUrl: "/manifest-saas.json",
      swUrl: "/sw.js",
      offlineUrl: "/offline-saas.html",
      themeColor: theme,
      backgroundColor: DEFAULT_BG,
      appName: wl?.agencyName?.trim() || DEFAULT_NAME,
      whiteLabel: !!wl?.agencyName,
      stats,
    };
  }

  async recordInstall(
    tenantId: string,
    input: { userId?: string | null; platform?: PwaInstallPlatform; displayMode?: string; userAgent?: string | null },
  ): Promise<{ id: string }> {
    const platform = input.platform ?? "unknown";
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_pwa_installs (tenant_id, user_id, platform, display_mode, user_agent)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [tenantId, input.userId ?? null, platform, input.displayMode ?? "browser", input.userAgent ?? null],
    );
    return { id: rows[0]!.id };
  }

  async getInstallStats(tenantId: string): Promise<PwaInstallStats> {
    try {
      const rows = await this.db.query<{ platform: string; count: string; last_at: string | null }>(
        `SELECT platform, COUNT(*) AS count, MAX(installed_at) AS last_at
         FROM saas_pwa_installs
         WHERE tenant_id = $1
         GROUP BY platform`,
        [tenantId],
      );
      let total = 0;
      let lastInstalledAt: string | null = null;
      const byPlatform: Record<string, number> = {};
      for (const r of rows) {
        const n = parseInt(r.count, 10);
        total += n;
        byPlatform[r.platform] = n;
        if (r.last_at && (!lastInstalledAt || r.last_at > lastInstalledAt)) lastInstalledAt = r.last_at;
      }
      return { total, byPlatform, lastInstalledAt };
    } catch {
      return { total: 0, byPlatform: {}, lastInstalledAt: null };
    }
  }

  /** VAPID public key for browser push subscription (env or dev placeholder). */
  getVapidPublicKey(): string | null {
    const key = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
    return key || null;
  }

  async savePushSubscription(
    tenantId: string,
    input: { userId?: string | null; endpoint: string; p256dh: string; auth: string },
  ): Promise<{ id: string }> {
    if (!input.endpoint.trim() || !input.p256dh.trim() || !input.auth.trim()) {
      throw new SaasPwaError("VALIDATION", "endpoint, p256dh and auth are required");
    }
    try {
      const rows = await this.db.query<{ id: string }>(
        `INSERT INTO saas_pwa_push_subscriptions (tenant_id, user_id, endpoint, p256dh, auth)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (tenant_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_id = EXCLUDED.user_id
         RETURNING id`,
        [tenantId, input.userId ?? null, input.endpoint.trim(), input.p256dh.trim(), input.auth.trim()],
      );
      return { id: rows[0]!.id };
    } catch {
      throw new SaasPwaError("VALIDATION", "Push subscriptions table unavailable — run migration 484");
    }
  }

  async removePushSubscription(tenantId: string, endpoint: string): Promise<void> {
    try {
      await this.db.query(
        `DELETE FROM saas_pwa_push_subscriptions WHERE tenant_id = $1 AND endpoint = $2`,
        [tenantId, endpoint.trim()],
      );
    } catch {
      /* table may be absent in dev */
    }
  }

  async countPushSubscriptions(tenantId: string, userId?: string | null): Promise<number> {
    try {
      const rows = await this.db.query<{ count: string }>(
        userId
          ? `SELECT COUNT(*)::text AS count FROM saas_pwa_push_subscriptions WHERE tenant_id = $1 AND user_id = $2`
          : `SELECT COUNT(*)::text AS count FROM saas_pwa_push_subscriptions WHERE tenant_id = $1`,
        userId ? [tenantId, userId] : [tenantId],
      );
      return parseInt(rows[0]?.count ?? "0", 10);
    } catch {
      return 0;
    }
  }
}
