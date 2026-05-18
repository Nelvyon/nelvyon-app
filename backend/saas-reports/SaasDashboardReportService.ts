import { randomUUID } from "node:crypto";

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

export interface GenerateDashboardReportResult {
  reportId: string;
  downloadUrl: string;
  sizeBytes: number;
  fileCount: number;
}

export class SaasDashboardReportService {
  async collectReportInput(userId: string): Promise<DashboardReportInput> {
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

  async generateAndPublish(userId: string, tenantId: string): Promise<GenerateDashboardReportResult> {
    const input = await this.collectReportInput(userId);
    const files = buildDashboardReportFiles(input);
    const reportId = `rpt_${randomUUID()}`;
    const published = await publishDashboardReportZip({
      tenantId,
      userId,
      reportId,
      files,
    });
    return {
      reportId,
      downloadUrl: published.downloadUrl,
      sizeBytes: published.sizeBytes,
      fileCount: published.fileCount,
    };
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
