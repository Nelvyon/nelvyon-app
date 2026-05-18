import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasDashboardReportService } from "@nelvyon/saas-reports";
import { getSaasOnboardingService } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

/** Genera informe ZIP del dashboard con métricas reales del cliente y devuelve URL de descarga. */
export async function POST(req: Request) {
  try {
    const claims = await authenticate(req);
    const onboarding = getSaasOnboardingService();
    const tenant = await onboarding.getTenant(claims.userId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const report = await getSaasDashboardReportService().generateAndPublish(
      claims.userId,
      claims.tenantId,
    );

    return NextResponse.json({
      reportId: report.reportId,
      downloadUrl: report.downloadUrl,
      sizeBytes: report.sizeBytes,
      fileCount: report.fileCount,
    });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message || "Error interno" }, { status: 500 });
  }
}
