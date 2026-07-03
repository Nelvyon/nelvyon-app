/**
 * S58 — Unified audit export: saas_agent_runs + pack runs + audit_logs → CSV/PDF
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { buildMinimalPdfFromText } from "./OsDeliveryCertificateService";

export type UnifiedAuditRow = {
  id: string;
  source: "audit_log" | "agent_run" | "pack_run";
  action: string;
  module: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export type UnifiedAuditFilters = {
  from?: string;
  to?: string;
  source?: string;
  limit?: number;
};

export class SaasUnifiedAuditExportService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string, filters: UnifiedAuditFilters = {}): Promise<UnifiedAuditRow[]> {
    const limit = Math.min(filters.limit ?? 500, 2000);
    const rows: UnifiedAuditRow[] = [];

    const auditRows = await this.db.query<Record<string, unknown>>(
      `SELECT id, action, module, resource_id, details, created_at
       FROM audit_logs WHERE tenant_id = $1
       ${filters.from ? "AND created_at >= $2::timestamptz" : ""}
       ORDER BY created_at DESC LIMIT $${filters.from ? 3 : 2}`,
      filters.from ? [tenantId, filters.from, limit] : [tenantId, limit],
    );
    for (const r of auditRows) {
      rows.push({
        id: String(r.id),
        source: "audit_log",
        action: String(r.action),
        module: String(r.module),
        resourceId: r.resource_id != null ? String(r.resource_id) : null,
        details: (r.details as Record<string, unknown>) ?? {},
        createdAt: String(r.created_at),
      });
    }

    const agentRows = await this.db.query<Record<string, unknown>>(
      `SELECT id, agent_id, status, input, output, created_at
       FROM saas_agent_runs WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit],
    ).catch(() => [] as Record<string, unknown>[]);
    for (const r of agentRows) {
      rows.push({
        id: String(r.id),
        source: "agent_run",
        action: String(r.status ?? "run"),
        module: `agent:${String(r.agent_id ?? "")}`,
        resourceId: String(r.agent_id ?? ""),
        details: {
          input: r.input,
          output: r.output,
        },
        createdAt: String(r.created_at),
      });
    }

    const wsRows = await this.db.query<{ workspace_id: number | null }>(
      `SELECT workspace_id FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    const wsId = wsRows[0]?.workspace_id;
    if (wsId) {
      const packRows = await this.db.query<Record<string, unknown>>(
        `SELECT id, pack_id, status, report, created_at FROM nelvyon_pack_runs
         WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [wsId, limit],
      ).catch(() => [] as Record<string, unknown>[]);
      for (const r of packRows) {
        const report = (r.report as Record<string, unknown>) ?? {};
        rows.push({
          id: String(r.id),
          source: "pack_run",
          action: String(r.status),
          module: `pack:${String(r.pack_id ?? "")}`,
          resourceId: String(r.id),
          details: {
            avg_qa: report.avg_qa_score,
            pack_name: report.pack_name,
          },
          createdAt: String(r.created_at),
        });
      }
    }

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return rows.slice(0, limit);
  }

  toCsv(rows: UnifiedAuditRow[]): string {
    const header = "source,action,module,resource_id,created_at,details\n";
    const body = rows.map((r) => {
      const det = JSON.stringify(r.details).replace(/"/g, '""');
      return `${r.source},${r.action},${r.module},${r.resourceId ?? ""},${r.createdAt},"${det}"`;
    }).join("\n");
    return header + body;
  }

  toPdf(rows: UnifiedAuditRow[], title = "Nelvyon Unified Audit"): Buffer {
    const lines = [
      title,
      `Generated: ${new Date().toISOString()}`,
      `Total events: ${rows.length}`,
      "",
      ...rows.slice(0, 200).map(
        (r) => `[${r.createdAt}] ${r.source} | ${r.module} | ${r.action} | ${r.resourceId ?? "-"}`,
      ),
    ];
    return buildMinimalPdfFromText(lines, title);
  }
}

let _svc: SaasUnifiedAuditExportService | undefined;
export function getSaasUnifiedAuditExportService(): SaasUnifiedAuditExportService {
  _svc ??= new SaasUnifiedAuditExportService();
  return _svc;
}
export function resetSaasUnifiedAuditExportServiceForTests(): void {
  _svc = undefined;
}
