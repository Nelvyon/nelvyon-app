import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export const DEFAULT_DASHBOARD_WIDGETS = [
  "health",
  "activation",
  "pipeline",
  "modules",
  "kpis",
  "activity",
  "quickActions",
] as const;

export type DashboardWidgetId = (typeof DEFAULT_DASHBOARD_WIDGETS)[number];

export type DashboardLayout = {
  widgets: DashboardWidgetId[];
};

export class SaasDashboardLayoutError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION" | "NOT_FOUND",
  ) {
    super(message);
    this.name = "SaasDashboardLayoutError";
  }
}

const ALLOWED = new Set<string>(DEFAULT_DASHBOARD_WIDGETS);

function normalizeLayout(raw: unknown): DashboardLayout {
  if (!raw || typeof raw !== "object") {
    return { widgets: [...DEFAULT_DASHBOARD_WIDGETS] };
  }
  const widgetsRaw = (raw as { widgets?: unknown }).widgets;
  if (!Array.isArray(widgetsRaw)) {
    return { widgets: [...DEFAULT_DASHBOARD_WIDGETS] };
  }
  const seen = new Set<string>();
  const widgets: DashboardWidgetId[] = [];
  for (const w of widgetsRaw) {
    const id = String(w);
    if (!ALLOWED.has(id) || seen.has(id)) continue;
    seen.add(id);
    widgets.push(id as DashboardWidgetId);
  }
  return { widgets: widgets.length > 0 ? widgets : [...DEFAULT_DASHBOARD_WIDGETS] };
}

export class SaasDashboardLayoutService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async getLayout(tenantId: string): Promise<DashboardLayout> {
    const rows = await this.db.query<{ dashboard_layout: unknown }>(
      `SELECT dashboard_layout FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    if (!rows[0]) throw new SaasDashboardLayoutError("Tenant not found", "NOT_FOUND");
    return normalizeLayout(rows[0].dashboard_layout);
  }

  async updateLayout(tenantId: string, layout: DashboardLayout): Promise<DashboardLayout> {
    const normalized = normalizeLayout(layout);
    const rows = await this.db.query<{ dashboard_layout: unknown }>(
      `UPDATE saas_tenants SET dashboard_layout = $2::jsonb, updated_at = NOW()
       WHERE id = $1 RETURNING dashboard_layout`,
      [tenantId, JSON.stringify(normalized)],
    );
    if (!rows[0]) throw new SaasDashboardLayoutError("Tenant not found", "NOT_FOUND");
    return normalizeLayout(rows[0].dashboard_layout);
  }
}

let _svc: SaasDashboardLayoutService | undefined;
export function getSaasDashboardLayoutService(): SaasDashboardLayoutService {
  _svc ??= new SaasDashboardLayoutService();
  return _svc;
}
export function resetSaasDashboardLayoutServiceForTests(): void {
  _svc = undefined;
}
