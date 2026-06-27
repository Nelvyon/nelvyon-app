/**
 * O25 — OsRetainerAutopilotService
 * Builds a verifiable monthly retainer cycle per tenant: autopilot toggles define the
 * expected services, the O19 recurring run log + deliverables define what was actually
 * delivered, and the cycle status (open/partial/verified/failed) proves it — for both
 * the OS CEO dashboard and the client portal. No billing in v1, delivery proof only.
 *
 * Ports injectable so vitest never hits autopilot/recurring/deliverables; prod lazy.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type RetainerService = "seo" | "social" | "reputation" | "ads";
export type RetainerCycleStatus = "open" | "partial" | "verified" | "failed";

// ── Ports ───────────────────────────────────────────────────────────────────────

export type AutopilotPortSettings = {
  tenantId: string;
  seoEnabled: boolean;
  socialEnabled: boolean;
  reputationEnabled: boolean;
  adsEnabled: boolean;
};

export type AutopilotPort = {
  getSettings(tenantId: string): Promise<AutopilotPortSettings | null>;
  listEligibleTenants(): Promise<string[]>;
};

export type RecurringRunLite = { serviceType: RetainerService; status: string; deliverableId: string | null };
export type RecurringLogPort = {
  listRuns(filters: { tenantId: string; periodKey: string }): Promise<RecurringRunLite[]>;
};

export type DeliverableLite = { id: string; serviceType: string };
export type DeliverablesPort = {
  listByTenantPeriod(tenantId: string, periodKey: string): Promise<DeliverableLite[]>;
};

export type CertificatePort = {
  getByPackRunIds(ids: string[]): Promise<string[]>;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type RetainerServiceView = {
  type: RetainerService;
  label: string;
  status: "delivered" | "pending" | "failed";
  deliverableId?: string | null;
  completedAt?: string | null;
  portalUrl?: string | null;
};

export type RetainerCycle = {
  id: string;
  tenantId: string;
  workspaceId: number | null;
  periodKey: string;
  status: RetainerCycleStatus;
  servicesExpected: RetainerService[];
  servicesDelivered: RetainerService[];
  deliverableIds: string[];
  recurringRunIds: string[];
  certificateIds: string[];
  portalVisible: boolean;
  verifiedAt: string | null;
  metadata: Record<string, unknown>;
};

export type RetainerSummary = {
  open: number;
  partial: number;
  verified: number;
  failed: number;
  tenantsTracked: number;
  lastPeriod: string | null;
};

export type PortalRetainerView = {
  periodKey: string;
  status: RetainerCycleStatus;
  active: boolean;
  services: RetainerServiceView[];
  history: Array<{ periodKey: string; status: RetainerCycleStatus }>;
};

export type OsRetainerErrorCode = "NOT_FOUND";
export class OsRetainerError extends Error {
  constructor(public readonly code: OsRetainerErrorCode, message: string) {
    super(message);
    this.name = "OsRetainerError";
  }
}

const SERVICE_LABELS: Record<RetainerService, string> = {
  seo: "SEO mensual",
  social: "Calendario social",
  reputation: "Reputación / reseñas",
  ads: "Snapshot de Ads",
};

// ── Pure helpers (exported for tests) ────────────────────────────────────────────

export function expectedServicesFromSettings(settings: AutopilotPortSettings | null): RetainerService[] {
  if (!settings) return [];
  const out: RetainerService[] = [];
  if (settings.seoEnabled) out.push("seo");
  if (settings.socialEnabled) out.push("social");
  if (settings.reputationEnabled) out.push("reputation");
  if (settings.adsEnabled) out.push("ads");
  return out;
}

export function computeCycleStatus(
  expected: RetainerService[],
  runs: RecurringRunLite[],
): { status: RetainerCycleStatus; delivered: RetainerService[] } {
  if (expected.length === 0) return { status: "open", delivered: [] };
  const byService = new Map<RetainerService, string>();
  for (const r of runs) {
    // completed wins; otherwise keep first seen status
    if (!byService.has(r.serviceType) || r.status === "completed") byService.set(r.serviceType, r.status);
  }
  const delivered: RetainerService[] = [];
  let anyFailed = false;
  for (const svc of expected) {
    const st = byService.get(svc);
    if (st === "completed") delivered.push(svc);
    else if (st === "failed") anyFailed = true;
  }
  if (delivered.length === expected.length) return { status: "verified", delivered };
  if (delivered.length > 0) return { status: "partial", delivered };
  if (anyFailed) return { status: "failed", delivered };
  return { status: "open", delivered };
}

// ── Row mapping ──────────────────────────────────────────────────────────────────

type CycleRow = {
  id: string; tenant_id: string; workspace_id: number | null; period_key: string;
  status: RetainerCycleStatus; services_expected: RetainerService[]; services_delivered: RetainerService[];
  deliverable_ids: string[]; recurring_run_ids: string[]; certificate_ids: string[];
  portal_visible: boolean; verified_at: string | null; metadata: Record<string, unknown>;
};

function rowToCycle(r: CycleRow): RetainerCycle {
  return {
    id: r.id, tenantId: r.tenant_id, workspaceId: r.workspace_id, periodKey: r.period_key,
    status: r.status, servicesExpected: r.services_expected ?? [], servicesDelivered: r.services_delivered ?? [],
    deliverableIds: r.deliverable_ids ?? [], recurringRunIds: r.recurring_run_ids ?? [],
    certificateIds: r.certificate_ids ?? [], portalVisible: r.portal_visible, verifiedAt: r.verified_at,
    metadata: r.metadata ?? {},
  };
}

// ── Default ports ────────────────────────────────────────────────────────────────

const defaultAutopilotPort: AutopilotPort = {
  async getSettings(tenantId) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSaasAutopilotService } = require("./SaasAutopilotService") as {
      getSaasAutopilotService: () => { getSettings(t: string): Promise<AutopilotPortSettings> };
    };
    return getSaasAutopilotService().getSettings(tenantId);
  },
  async listEligibleTenants() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSaasAutopilotService } = require("./SaasAutopilotService") as {
      getSaasAutopilotService: () => { listEligibleTenants(): Promise<string[]> };
    };
    return getSaasAutopilotService().listEligibleTenants();
  },
};

const defaultRecurringLogPort: RecurringLogPort = {
  async listRuns(filters) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getOsRecurringRunLogService } = require("./OsRecurringRunLogService") as {
      getOsRecurringRunLogService: () => { listRuns(f: { tenantId: string; periodKey: string }): Promise<RecurringRunLite[]> };
    };
    return getOsRecurringRunLogService().listRuns(filters);
  },
};

function defaultDeliverablesPort(db: SaasPostgresPort): DeliverablesPort {
  return {
    async listByTenantPeriod(tenantId, periodKey) {
      try {
        const rows = await db.query<{ id: string; service_type: string }>(
          `SELECT id, service_type FROM saas_recurring_deliverables WHERE tenant_id = $1 AND month = $2`,
          [tenantId, periodKey],
        );
        return rows.map((r) => ({ id: r.id, serviceType: r.service_type }));
      } catch {
        return [];
      }
    },
  };
}

const defaultCertificatePort: CertificatePort = {
  async getByPackRunIds() { return []; },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsRetainerAutopilotService | null = null;

export function getOsRetainerAutopilotService(): OsRetainerAutopilotService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    const db = DbClient.getInstance();
    _instance = new OsRetainerAutopilotService(db, defaultAutopilotPort, defaultRecurringLogPort, defaultDeliverablesPort(db), defaultCertificatePort);
  }
  return _instance;
}

export function resetOsRetainerAutopilotServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsRetainerAutopilotService {
  private readonly deliverables: DeliverablesPort;

  constructor(
    private readonly db: SaasPostgresPort,
    private readonly autopilot: AutopilotPort = defaultAutopilotPort,
    private readonly recurring: RecurringLogPort = defaultRecurringLogPort,
    deliverables?: DeliverablesPort,
    private readonly certificates: CertificatePort = defaultCertificatePort,
  ) {
    this.deliverables = deliverables ?? defaultDeliverablesPort(db);
  }

  periodKey(d: Date = new Date()): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  /** UPSERT the cycle for a tenant/period from autopilot expectations + delivery proof. */
  async syncCycle(tenantId: string, periodKey?: string): Promise<RetainerCycle> {
    const period = periodKey ?? this.periodKey();
    const settings = await this.autopilot.getSettings(tenantId).catch(() => null);
    const expected = expectedServicesFromSettings(settings);

    const runs = await this.recurring.listRuns({ tenantId, periodKey: period }).catch(() => [] as RecurringRunLite[]);
    const { status, delivered } = computeCycleStatus(expected, runs);

    const deliverableRows = await this.deliverables.listByTenantPeriod(tenantId, period).catch(() => [] as DeliverableLite[]);
    const deliverableIds = deliverableRows.map((d) => d.id);
    const recurringRunIds = runs.map((r) => r.deliverableId).filter((x): x is string => !!x);
    const verifiedAt = status === "verified" ? new Date().toISOString() : null;

    const rows = await this.db.query<CycleRow>(
      `INSERT INTO os_retainer_cycles
         (tenant_id, period_key, status, services_expected, services_delivered, deliverable_ids, recurring_run_ids, verified_at)
       VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8)
       ON CONFLICT (tenant_id, period_key) DO UPDATE SET
         status = EXCLUDED.status, services_expected = EXCLUDED.services_expected,
         services_delivered = EXCLUDED.services_delivered, deliverable_ids = EXCLUDED.deliverable_ids,
         recurring_run_ids = EXCLUDED.recurring_run_ids,
         verified_at = COALESCE(os_retainer_cycles.verified_at, EXCLUDED.verified_at),
         updated_at = NOW()
       RETURNING *`,
      [
        tenantId, period, status, JSON.stringify(expected), JSON.stringify(delivered),
        JSON.stringify(deliverableIds), JSON.stringify(recurringRunIds), verifiedAt,
      ],
    );
    return rowToCycle(rows[0]!);
  }

  /** Cron helper — sync every autopilot-eligible tenant (best-effort per tenant). */
  async syncAllEligibleTenants(periodKey?: string): Promise<{ synced: number }> {
    let tenants: string[] = [];
    try { tenants = await this.autopilot.listEligibleTenants(); } catch { tenants = []; }
    let synced = 0;
    for (const t of tenants) {
      try { await this.syncCycle(t, periodKey); synced++; } catch { /* skip tenant */ }
    }
    return { synced };
  }

  async getCycle(tenantId: string, periodKey: string): Promise<RetainerCycle> {
    const rows = await this.db.query<CycleRow>(
      `SELECT * FROM os_retainer_cycles WHERE tenant_id = $1::uuid AND period_key = $2`,
      [tenantId, periodKey],
    );
    if (!rows[0]) throw new OsRetainerError("NOT_FOUND", `Ciclo ${tenantId}/${periodKey} no encontrado`);
    return rowToCycle(rows[0]);
  }

  async listCycles(filters: { tenantId?: string; periodKey?: string; status?: RetainerCycleStatus; limit?: number } = {}): Promise<RetainerCycle[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.tenantId) { conditions.push(`tenant_id = $${idx++}::uuid`); params.push(filters.tenantId); }
    if (filters.periodKey) { conditions.push(`period_key = $${idx++}`); params.push(filters.periodKey); }
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await this.db.query<CycleRow>(
      `SELECT * FROM os_retainer_cycles ${where} ORDER BY period_key DESC, updated_at DESC LIMIT $${idx}`,
      [...params, Math.min(Math.max(filters.limit ?? 50, 1), 200)],
    );
    return rows.map(rowToCycle);
  }

  async getSummary(): Promise<RetainerSummary> {
    const rows = await this.db.query<{ status: RetainerCycleStatus; count: string }>(
      `SELECT status, COUNT(*) AS count FROM os_retainer_cycles GROUP BY status`,
    );
    const summary: RetainerSummary = { open: 0, partial: 0, verified: 0, failed: 0, tenantsTracked: 0, lastPeriod: null };
    for (const r of rows) {
      const n = parseInt(r.count, 10);
      if (r.status in summary) (summary as unknown as Record<string, number>)[r.status] = n;
    }
    try {
      const t = await this.db.query<{ c: string }>(`SELECT COUNT(DISTINCT tenant_id) AS c FROM os_retainer_cycles`);
      summary.tenantsTracked = parseInt(t[0]?.c ?? "0", 10);
      const p = await this.db.query<{ period_key: string }>(`SELECT period_key FROM os_retainer_cycles ORDER BY period_key DESC LIMIT 1`);
      summary.lastPeriod = p[0]?.period_key ?? null;
    } catch { /* ignore */ }
    return summary;
  }

  /** Resolve the SaaS tenant id for a workspace, then build the portal view. */
  async getPortalRetainerViewByWorkspace(workspaceId: number): Promise<PortalRetainerView> {
    let tenantId: string | null = null;
    try {
      const rows = await this.db.query<{ id: string }>(
        `SELECT id::text FROM saas_tenants WHERE workspace_id = $1 LIMIT 1`,
        [workspaceId],
      );
      tenantId = rows[0]?.id ?? null;
    } catch { /* fall through */ }
    if (!tenantId) {
      return { periodKey: this.periodKey(), status: "open", active: false, services: [], history: [] };
    }
    return this.getPortalRetainerView(tenantId);
  }

  /** Client portal view: current period checklist + last 6 periods of history. */
  async getPortalRetainerView(tenantId: string): Promise<PortalRetainerView> {
    const period = this.periodKey();
    const settings = await this.autopilot.getSettings(tenantId).catch(() => null);
    const expected = expectedServicesFromSettings(settings);

    let cycle: RetainerCycle | null = null;
    try { cycle = await this.getCycle(tenantId, period); } catch { cycle = null; }
    // If no cycle row yet, sync once so the portal reflects current state.
    if (!cycle && expected.length > 0) {
      cycle = await this.syncCycle(tenantId, period).catch(() => null);
    }

    const runs = await this.recurring.listRuns({ tenantId, periodKey: period }).catch(() => [] as RecurringRunLite[]);
    const runStatus = new Map<RetainerService, RecurringRunLite>();
    for (const r of runs) {
      if (!runStatus.has(r.serviceType) || r.status === "completed") runStatus.set(r.serviceType, r);
    }

    const services: RetainerServiceView[] = expected.map((type) => {
      const r = runStatus.get(type);
      const status = r?.status === "completed" ? "delivered" : r?.status === "failed" ? "failed" : "pending";
      return {
        type,
        label: SERVICE_LABELS[type],
        status,
        deliverableId: r?.deliverableId ?? null,
        portalUrl: r?.deliverableId ? `/portal/deliverables?ref=${r.deliverableId}` : null,
      };
    });

    const historyRows = await this.listCycles({ tenantId, limit: 6 }).catch(() => [] as RetainerCycle[]);
    return {
      periodKey: period,
      status: cycle?.status ?? (expected.length === 0 ? "open" : "open"),
      active: expected.length > 0,
      services,
      history: historyRows.map((c) => ({ periodKey: c.periodKey, status: c.status })),
    };
  }
}
