import { randomUUID } from "node:crypto";

import { DbClient } from "../db/DbClient";
import {
  getDashboardMetricsService,
  getSaasDashboardService,
  getSaasOnboardingService,
  type DashboardMetricsSummary,
} from "../saas";
import {
  buildDashboardReportFiles,
  publishDashboardReportZip,
  type DashboardReportInput,
} from "./dashboardReportBuilder";

export const SAAS_REPORT_TYPE_LABELS: Record<string, string> = {
  executive_summary: "Resumen ejecutivo",
  email_marketing: "Email Marketing",
  crm_pipeline: "CRM & Pipeline",
  seo_ranking: "SEO & Posicionamiento",
  social_engagement: "Redes Sociales",
  ad_performance: "Publicidad Digital",
};

export type GenerateDashboardReportOptions = {
  /** Report catalog type from the UI — used for name/title; metrics come from the same real dashboard sources. */
  type?: string;
};

export interface GenerateDashboardReportResult {
  reportId: string;
  /** Row id in saas_reports (UUID), when persistence succeeded. */
  persistedId: string | null;
  downloadUrl: string;
  sizeBytes: number;
  fileCount: number;
  type: string;
  name: string;
}

export class SaasDashboardReportService {
  async collectReportInput(userId: string, reportTitle?: string): Promise<DashboardReportInput> {
    const onboarding = getSaasOnboardingService();
    const tenant = await onboarding.getTenant(userId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const [opsSummary, metrics] = await Promise.all([
      getSaasDashboardService().getDashboardSummary(tenant.id),
      getDashboardMetricsService().getDashboardSummary(userId).catch(
        (): DashboardMetricsSummary => ({ roi: [], traffic: [], conversions: [], mrr: [] }),
      ),
    ]);

    return {
      companyName: tenant.companyName,
      industry: tenant.industry,
      plan: tenant.plan,
      generatedAt: new Date().toLocaleDateString("es-ES", { dateStyle: "long" }),
      reportTitle,
      activeJobs: opsSummary.activeJobs,
      completedJobs: opsSummary.completedJobs,
      totalSpend: opsSummary.totalSpend,
      metrics: {
        roi: metrics.roi,
        traffic: metrics.traffic,
        conversions: metrics.conversions,
        mrr: metrics.mrr,
      },
      charts: [
        { label: "ROI", points: metrics.roi.map((r) => ({ ...r })) },
        { label: "Tráfico", points: metrics.traffic.map((t) => ({ ...t })) },
      ],
    };
  }

  /**
   * Generates the executive dashboard ZIP from real tenant metrics and persists
   * a row in saas_reports so the UI historial can list/download it later.
   */
  async generateAndPublish(
    userId: string,
    tenantId: string,
    options: GenerateDashboardReportOptions = {},
  ): Promise<GenerateDashboardReportResult> {
    const type = (options.type?.trim() || "executive_summary").slice(0, 64);
    const name = SAAS_REPORT_TYPE_LABELS[type] ?? type;
    const input = await this.collectReportInput(userId, name);
    const files = buildDashboardReportFiles(input);
    const reportId = `rpt_${randomUUID()}`;
    const published = await publishDashboardReportZip({
      tenantId,
      userId,
      reportId,
      files,
    });

    const persistedId = await this.persistReportRow({
      tenantId,
      name,
      type,
      downloadUrl: published.downloadUrl,
      sizeBytes: published.sizeBytes,
    });

    return {
      reportId,
      persistedId,
      downloadUrl: published.downloadUrl,
      sizeBytes: published.sizeBytes,
      fileCount: published.fileCount,
      type,
      name,
    };
  }

  private async persistReportRow(args: {
    tenantId: string;
    name: string;
    type: string;
    downloadUrl: string;
    sizeBytes: number;
  }): Promise<string | null> {
    try {
      const rows = await DbClient.getInstance().query<{ id: string }>(
        `INSERT INTO saas_reports (tenant_id, name, type, status, download_url, size_bytes)
         VALUES ($1, $2, $3, 'ready', $4, $5)
         RETURNING id`,
        [args.tenantId, args.name, args.type, args.downloadUrl, args.sizeBytes],
      );
      return rows[0]?.id ?? null;
    } catch (e) {
      // Artifact already published — do not fail the download path if historial insert fails
      // (e.g. schema not migrated yet). Log via stderr for ops visibility.
      console.error(
        "[SaasDashboardReportService] saas_reports INSERT failed — report ZIP still available",
        e instanceof Error ? e.message : String(e),
      );
      return null;
    }
  }
}

let cached: SaasDashboardReportService | undefined;

export function getSaasDashboardReportService(): SaasDashboardReportService {
  if (!cached) cached = new SaasDashboardReportService();
  return cached;
}

export function resetSaasDashboardReportServiceForTests(): void {
  cached = undefined;
}
