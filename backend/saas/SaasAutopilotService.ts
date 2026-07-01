import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AutopilotService = "seo" | "social" | "reputation" | "ads";

export interface AutopilotSettings {
  tenantId: string;
  seoEnabled: boolean;
  socialEnabled: boolean;
  reputationEnabled: boolean;
  adsEnabled: boolean;
  seoDayOfMonth: number;
  socialDayOfMonth: number;
  lastSeoRunAt: string | null;
  lastSocialRunAt: string | null;
  lastReputationRunAt: string | null;
  lastAdsRunAt: string | null;
  updatedAt: string;
}

export interface AutopilotStatus extends AutopilotSettings {
  activeCount: number;
  nextSeoRun: string | null;
  nextSocialRun: string | null;
}

export interface UpdateAutopilotInput {
  seoEnabled?: boolean;
  socialEnabled?: boolean;
  reputationEnabled?: boolean;
  adsEnabled?: boolean;
  seoDayOfMonth?: number;
  socialDayOfMonth?: number;
}

export interface RunNowResult {
  service: AutopilotService;
  success: boolean;
  message: string;
  deliverableId?: string;
}

export class SaasAutopilotError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION" | "DISABLED") {
    super(message);
    this.name = "SaasAutopilotError";
  }
}

// ── Row type ──────────────────────────────────────────────────────────────────

interface SettingsRow {
  tenant_id: string;
  seo_enabled: boolean;
  social_enabled: boolean;
  reputation_enabled: boolean;
  ads_enabled: boolean;
  seo_day_of_month: number;
  social_day_of_month: number;
  last_seo_run_at: string | null;
  last_social_run_at: string | null;
  last_reputation_run_at: string | null;
  last_ads_run_at: string | null;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToSettings(r: SettingsRow): AutopilotSettings {
  return {
    tenantId: r.tenant_id,
    seoEnabled: r.seo_enabled,
    socialEnabled: r.social_enabled,
    reputationEnabled: r.reputation_enabled,
    adsEnabled: r.ads_enabled,
    seoDayOfMonth: r.seo_day_of_month,
    socialDayOfMonth: r.social_day_of_month,
    lastSeoRunAt: r.last_seo_run_at,
    lastSocialRunAt: r.last_social_run_at,
    lastReputationRunAt: r.last_reputation_run_at,
    lastAdsRunAt: r.last_ads_run_at,
    updatedAt: r.updated_at,
  };
}

function nextRunDate(dayOfMonth: number): string {
  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, 8, 0, 0));
  if (candidate <= now) {
    // Already passed this month — next month
    candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  }
  return candidate.toISOString();
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasAutopilotService {
  constructor(private readonly db: SaasPostgresPort) {}

  async getSettings(tenantId: string): Promise<AutopilotSettings> {
    const rows = await this.db.query<SettingsRow>(
      `INSERT INTO saas_autopilot_settings (tenant_id)
       VALUES ($1)
       ON CONFLICT (tenant_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
       RETURNING *`,
      [tenantId],
    );
    return rowToSettings(rows[0]!);
  }

  async updateSettings(tenantId: string, input: UpdateAutopilotInput): Promise<AutopilotSettings> {
    // Validate days
    for (const key of ["seoDayOfMonth", "socialDayOfMonth"] as const) {
      const val = input[key];
      if (val !== undefined && (val < 1 || val > 28)) {
        throw new SaasAutopilotError(`${key} must be between 1 and 28`, "VALIDATION");
      }
    }

    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [tenantId];

    const fieldMap: Record<keyof UpdateAutopilotInput, string> = {
      seoEnabled: "seo_enabled",
      socialEnabled: "social_enabled",
      reputationEnabled: "reputation_enabled",
      adsEnabled: "ads_enabled",
      seoDayOfMonth: "seo_day_of_month",
      socialDayOfMonth: "social_day_of_month",
    };

    for (const [jsKey, dbCol] of Object.entries(fieldMap) as [keyof UpdateAutopilotInput, string][]) {
      if (input[jsKey] !== undefined) {
        params.push(input[jsKey]);
        sets.push(`${dbCol} = $${params.length}`);
      }
    }

    const rows = await this.db.query<SettingsRow>(
      `UPDATE saas_autopilot_settings SET ${sets.join(", ")}
       WHERE tenant_id = $1
       RETURNING *`,
      params,
    );

    if (!rows[0]) {
      // Row may not exist yet — UPSERT
      return this.getSettings(tenantId);
    }
    return rowToSettings(rows[0]);
  }

  async getStatus(tenantId: string): Promise<AutopilotStatus> {
    const settings = await this.getSettings(tenantId);
    const activeCount = [
      settings.seoEnabled,
      settings.socialEnabled,
      settings.reputationEnabled,
      settings.adsEnabled,
    ].filter(Boolean).length;

    return {
      ...settings,
      activeCount,
      nextSeoRun: settings.seoEnabled ? nextRunDate(settings.seoDayOfMonth) : null,
      nextSocialRun: settings.socialEnabled ? nextRunDate(settings.socialDayOfMonth) : null,
    };
  }

  async runNow(tenantId: string, service: AutopilotService): Promise<RunNowResult> {
    const settings = await this.getSettings(tenantId);
    const month = currentMonth();

    switch (service) {
      case "seo": {
        // Dynamic import to avoid hard dependency in tests
        const { getOsRecurringServicesService } = await import("./OsRecurringServicesService");
        const svc = getOsRecurringServicesService();
        // Insert only seo_report via generateMonthlyDeliverables (UNIQUE skips dup)
        const all = await svc.generateMonthlyDeliverables(tenantId, month);
        const seoRow = all.find((d) => d.serviceType === "seo_report");
        await this._markLastRun(tenantId, "seo");
        await this._logRecurringRun(tenantId, month, all);
        return {
          service: "seo",
          success: true,
          message: seoRow ? `SEO report generado (${month})` : `SEO report ya existía para ${month}`,
          deliverableId: seoRow?.id,
        };
      }

      case "social": {
        const { getOsRecurringServicesService } = await import("./OsRecurringServicesService");
        const svc = getOsRecurringServicesService();
        const all = await svc.generateMonthlyDeliverables(tenantId, month);
        const socialRow = all.find((d) => d.serviceType === "social_calendar");
        await this._markLastRun(tenantId, "social");
        await this._logRecurringRun(tenantId, month, all);
        return {
          service: "social",
          success: true,
          message: socialRow ? `Calendario social generado (${month})` : `Calendario social ya existía para ${month}`,
          deliverableId: socialRow?.id,
        };
      }

      case "reputation": {
        const { getSaasReputationService } = await import("./SaasReputationService");
        const svc = getSaasReputationService();
        const result = await svc.syncGbpReviews(tenantId);
        await this._markLastRun(tenantId, "reputation");
        return {
          service: "reputation",
          success: true,
          message: `Reputación sincronizada: ${result.synced} reviews (${result.newNegative} negativas nuevas)`,
        };
      }

      case "ads": {
        const { getSaasAdsDashboardService } = await import("./SaasAdsDashboardService");
        const svc = getSaasAdsDashboardService();
        const connections = await svc.listConnections(tenantId);
        if (connections.length === 0) {
          return { service: "ads", success: false, message: "Sin conexiones de Ads configuradas" };
        }
        const now = new Date();
        const dateEnd = now.toISOString().slice(0, 10);
        const dateStart = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
        let refreshed = 0;
        for (const conn of connections) {
          try {
            await svc.getMetrics(tenantId, conn.platform, dateStart, dateEnd);
            refreshed++;
          } catch {
            // Non-fatal: continue with other platforms
          }
        }
        await this._markLastRun(tenantId, "ads");
        return {
          service: "ads",
          success: true,
          message: `Métricas actualizadas para ${refreshed}/${connections.length} plataformas`,
        };
      }

      default:
        throw new SaasAutopilotError(`Unknown service: ${String(service)}`, "VALIDATION");
    }
  }

  /** Cross-module autopilot — runs all enabled services in sequence. */
  async runAllEnabled(tenantId: string): Promise<RunNowResult[]> {
    const settings = await this.getSettings(tenantId);
    const results: RunNowResult[] = [];
    const services: AutopilotService[] = [];
    if (settings.seoEnabled) services.push("seo");
    if (settings.socialEnabled) services.push("social");
    if (settings.reputationEnabled) services.push("reputation");
    if (settings.adsEnabled) services.push("ads");
    for (const svc of services) {
      results.push(await this.runNow(tenantId, svc));
    }
    return results;
  }

  async listEligibleTenants(): Promise<string[]> {
    const rows = await this.db.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM saas_autopilot_settings
       WHERE seo_enabled = true OR social_enabled = true
          OR reputation_enabled = true OR ads_enabled = true`,
      [],
    );
    return rows.map((r) => r.tenant_id);
  }

  private async _markLastRun(tenantId: string, service: AutopilotService): Promise<void> {
    const col = `last_${service}_run_at`;
    await this.db.query(
      `UPDATE saas_autopilot_settings SET ${col} = NOW(), updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenantId],
    );
  }

  /** O19 — record the run in the recurring run log (best-effort, never throws). */
  private async _logRecurringRun(
    tenantId: string,
    month: string,
    deliverables: Array<{ serviceType: string; id: string }>,
  ): Promise<void> {
    try {
      const { getOsRecurringRunLogService } = await import("./OsRecurringRunLogService");
      await getOsRecurringRunLogService().recordGeneration(
        tenantId,
        month,
        deliverables.map((d) => ({ serviceType: d.serviceType, deliverableId: d.id })),
      );
    } catch { /* run-log persistence is best-effort */ }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: SaasAutopilotService | null = null;

export function getSaasAutopilotService(): SaasAutopilotService {
  if (!_instance) {
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new SaasAutopilotService(DbClient.getInstance());
  }
  return _instance;
}

export function resetSaasAutopilotServiceForTests(): void {
  _instance = null;
}
