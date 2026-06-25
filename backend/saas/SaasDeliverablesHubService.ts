import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeliverableSource = "os" | "recurring" | "pack_run";
export type DeliverableType =
  | "landing"
  | "seo"
  | "ads"
  | "chatbot"
  | "report"
  | "certificate"
  | "social_calendar"
  | "other";
export type DeliverableStatus =
  | "draft"
  | "in_review"
  | "delivered"
  | "approved"
  | "published"
  | "rejected"
  | "archived"
  | "generated";

export interface SaasDeliverable {
  id: string;
  source: DeliverableSource;
  type: DeliverableType;
  title: string;
  packId: string | null;
  status: DeliverableStatus;
  qaScore: number | null;
  legalPassed: boolean | null;
  downloadUrl: string | null;
  portalUrl: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export interface DeliverableSummary {
  total: number;
  pendingReview: number;
  approved: number;
  avgQaScore: number | null;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ListDeliverablesFilters {
  type?: DeliverableType;
  status?: DeliverableStatus;
  days?: number;
}

export class SaasDeliverablesHubError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION") {
    super(message);
    this.name = "SaasDeliverablesHubError";
  }
}

// ── Row types for DB ──────────────────────────────────────────────────────────

interface OsDeliverableRow {
  id: string;
  type: string | null;
  title: string;
  status: string;
  file_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  approved_at: string | null;
}

interface RecurringRow {
  id: string;
  service_type: string;
  month: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface PackRunRow {
  id: string;
  pack_id: string;
  status: string;
  report: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function osTypeToDeliverableType(raw: string | null): DeliverableType {
  if (!raw) return "other";
  const map: Record<string, DeliverableType> = {
    landing: "landing",
    seo: "seo",
    ads: "ads",
    chatbot: "chatbot",
    report: "report",
    certificate: "certificate",
  };
  return map[raw.toLowerCase()] ?? "other";
}

function recurringTypeToDeliverableType(serviceType: string): DeliverableType {
  if (serviceType === "seo_report") return "seo";
  if (serviceType === "social_calendar") return "social_calendar";
  if (serviceType === "ads_snapshot") return "ads";
  return "report";
}

function packIdToDeliverableType(packId: string): DeliverableType {
  if (packId.includes("landing") || packId.includes("local")) return "landing";
  if (packId.includes("seo")) return "seo";
  if (packId.includes("chatbot")) return "chatbot";
  if (packId.includes("ecommerce") || packId.includes("saas")) return "report";
  return "report";
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasDeliverablesHubService {
  constructor(private readonly db: SaasPostgresPort) {}

  async listDeliverables(
    tenantId: string,
    filters?: ListDeliverablesFilters,
  ): Promise<SaasDeliverable[]> {
    const since = filters?.days
      ? new Date(Date.now() - filters.days * 86_400_000).toISOString()
      : null;

    // 1. Workspace id for this tenant
    const tenantRows = await this.db.query<{ workspace_id: number | null }>(
      `SELECT workspace_id FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    const workspaceId = tenantRows[0]?.workspace_id ?? null;

    const results: SaasDeliverable[] = [];

    // 2. OS deliverables (via workspace_id)
    if (workspaceId !== null) {
      const params: unknown[] = [workspaceId];
      const conditions: string[] = ["workspace_id = $1"];
      if (since) { params.push(since); conditions.push(`created_at >= $${params.length}`); }
      const osRows = await this.db.query<OsDeliverableRow>(
        `SELECT id, type, title, status, file_url, metadata, created_at, approved_at
         FROM os_deliverables
         WHERE ${conditions.join(" AND ")}
         ORDER BY created_at DESC
         LIMIT 200`,
        params,
      );
      for (const r of osRows) {
        const dtype = osTypeToDeliverableType(r.type);
        if (filters?.type && dtype !== filters.type) continue;
        if (filters?.status && r.status !== filters.status) continue;
        const qa = typeof r.metadata?.qa_score === "number" ? (r.metadata.qa_score as number) : null;
        results.push({
          id: r.id,
          source: "os",
          type: dtype,
          title: r.title,
          packId: typeof r.metadata?.pack_id === "string" ? (r.metadata.pack_id as string) : null,
          status: r.status as DeliverableStatus,
          qaScore: qa,
          legalPassed: typeof r.metadata?.legal_passed === "boolean" ? (r.metadata.legal_passed as boolean) : null,
          downloadUrl: r.file_url,
          portalUrl: null,
          createdAt: r.created_at,
          approvedAt: r.approved_at,
        });
      }
    }

    // 3. Recurring deliverables
    {
      const params: unknown[] = [tenantId];
      const conditions: string[] = ["tenant_id = $1"];
      if (since) { params.push(since); conditions.push(`created_at >= $${params.length}`); }
      const recRows = await this.db.query<RecurringRow>(
        `SELECT id, service_type, month, status, payload, created_at
         FROM saas_recurring_deliverables
         WHERE ${conditions.join(" AND ")}
         ORDER BY created_at DESC
         LIMIT 200`,
        params,
      );
      for (const r of recRows) {
        const dtype = recurringTypeToDeliverableType(r.service_type);
        if (filters?.type && dtype !== filters.type) continue;
        if (filters?.status && r.status !== filters.status) continue;
        results.push({
          id: r.id,
          source: "recurring",
          type: dtype,
          title: `${r.service_type.replace("_", " ")} — ${r.month}`,
          packId: null,
          status: r.status as DeliverableStatus,
          qaScore: typeof r.payload?.qa_score === "number" ? (r.payload.qa_score as number) : null,
          legalPassed: null,
          downloadUrl: typeof r.payload?.download_url === "string" ? (r.payload.download_url as string) : null,
          portalUrl: null,
          createdAt: r.created_at,
          approvedAt: null,
        });
      }
    }

    // 4. Pack runs
    if (workspaceId !== null) {
      const params: unknown[] = [workspaceId];
      const conditions: string[] = ["workspace_id = $1", "status = 'completed'"];
      if (since) { params.push(since); conditions.push(`created_at >= $${params.length}`); }
      const packRows = await this.db.query<PackRunRow>(
        `SELECT id, pack_id, status, report, '{}'::jsonb AS metadata, created_at, completed_at
         FROM nelvyon_pack_runs
         WHERE ${conditions.join(" AND ")}
         ORDER BY created_at DESC
         LIMIT 100`,
        params,
      );
      for (const r of packRows) {
        const dtype = packIdToDeliverableType(r.pack_id);
        if (filters?.type && dtype !== filters.type) continue;
        if (filters?.status) continue; // pack_run "completed" maps to "delivered"
        const report = r.report ?? {};
        const qa = typeof report.qa_score === "number" ? (report.qa_score as number) : null;
        results.push({
          id: r.id,
          source: "pack_run",
          type: dtype,
          title: `Pack: ${r.pack_id}`,
          packId: r.pack_id,
          status: "delivered",
          qaScore: qa,
          legalPassed: typeof report.legal_passed === "boolean" ? (report.legal_passed as boolean) : null,
          downloadUrl: typeof report.download_url === "string" ? (report.download_url as string) : null,
          portalUrl: null,
          createdAt: r.created_at,
          approvedAt: r.completed_at,
        });
      }
    }

    // Sort merged results by createdAt DESC
    results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return results;
  }

  async getDeliverable(tenantId: string, id: string): Promise<SaasDeliverable> {
    // Try workspace_id
    const tenantRows = await this.db.query<{ workspace_id: number | null }>(
      `SELECT workspace_id FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    const workspaceId = tenantRows[0]?.workspace_id ?? null;

    // Try os_deliverables first
    if (workspaceId !== null) {
      const rows = await this.db.query<OsDeliverableRow>(
        `SELECT id, type, title, status, file_url, metadata, created_at, approved_at
         FROM os_deliverables WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
        [id, workspaceId],
      );
      if (rows[0]) {
        const r = rows[0];
        return {
          id: r.id,
          source: "os",
          type: osTypeToDeliverableType(r.type),
          title: r.title,
          packId: typeof r.metadata?.pack_id === "string" ? (r.metadata.pack_id as string) : null,
          status: r.status as DeliverableStatus,
          qaScore: typeof r.metadata?.qa_score === "number" ? (r.metadata.qa_score as number) : null,
          legalPassed: typeof r.metadata?.legal_passed === "boolean" ? (r.metadata.legal_passed as boolean) : null,
          downloadUrl: r.file_url,
          portalUrl: null,
          createdAt: r.created_at,
          approvedAt: r.approved_at,
        };
      }
    }

    // Try recurring
    const recRows = await this.db.query<RecurringRow>(
      `SELECT id, service_type, month, status, payload, created_at
       FROM saas_recurring_deliverables WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantId],
    );
    if (recRows[0]) {
      const r = recRows[0];
      return {
        id: r.id,
        source: "recurring",
        type: recurringTypeToDeliverableType(r.service_type),
        title: `${r.service_type.replace("_", " ")} — ${r.month}`,
        packId: null,
        status: r.status as DeliverableStatus,
        qaScore: typeof r.payload?.qa_score === "number" ? (r.payload.qa_score as number) : null,
        legalPassed: null,
        downloadUrl: typeof r.payload?.download_url === "string" ? (r.payload.download_url as string) : null,
        portalUrl: null,
        createdAt: r.created_at,
        approvedAt: null,
      };
    }

    // Try pack_run
    if (workspaceId !== null) {
      const packRows = await this.db.query<PackRunRow>(
        `SELECT id, pack_id, status, report, '{}'::jsonb AS metadata, created_at, completed_at
         FROM nelvyon_pack_runs WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
        [id, workspaceId],
      );
      if (packRows[0]) {
        const r = packRows[0];
        const report = r.report ?? {};
        return {
          id: r.id,
          source: "pack_run",
          type: packIdToDeliverableType(r.pack_id),
          title: `Pack: ${r.pack_id}`,
          packId: r.pack_id,
          status: "delivered",
          qaScore: typeof report.qa_score === "number" ? (report.qa_score as number) : null,
          legalPassed: typeof report.legal_passed === "boolean" ? (report.legal_passed as boolean) : null,
          downloadUrl: typeof report.download_url === "string" ? (report.download_url as string) : null,
          portalUrl: null,
          createdAt: r.created_at,
          approvedAt: r.completed_at,
        };
      }
    }

    throw new SaasDeliverablesHubError(`Deliverable ${id} not found`, "NOT_FOUND");
  }

  async getSummary(tenantId: string): Promise<DeliverableSummary> {
    const all = await this.listDeliverables(tenantId);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let qaSum = 0;
    let qaCount = 0;
    let pendingReview = 0;
    let approved = 0;

    for (const d of all) {
      byType[d.type] = (byType[d.type] ?? 0) + 1;
      byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
      if (d.qaScore !== null) { qaSum += d.qaScore; qaCount++; }
      if (d.status === "in_review") pendingReview++;
      if (d.status === "approved" || d.status === "published") approved++;
    }

    return {
      total: all.length,
      pendingReview,
      approved,
      avgQaScore: qaCount > 0 ? Math.round((qaSum / qaCount) * 10) / 10 : null,
      byType,
      byStatus,
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: SaasDeliverablesHubService | null = null;

export function getSaasDeliverablesHubService(): SaasDeliverablesHubService {
  if (!_instance) {
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new SaasDeliverablesHubService(DbClient.getInstance());
  }
  return _instance;
}

export function resetSaasDeliverablesHubServiceForTests(): void {
  _instance = null;
}
