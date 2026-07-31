import { NextResponse } from "next/server";

import { getSaasDashboardReportService } from "@nelvyon/saas-reports";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Genera informe ZIP del dashboard con métricas reales del cliente, persiste en saas_reports y devuelve URL de descarga. */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "reports.generate");
    const body = (await req.json().catch(() => ({}))) as { type?: unknown };
    const type = typeof body.type === "string" ? body.type : "executive_summary";

    const report = await getSaasDashboardReportService().generateAndPublish(
      ctx.claims.userId,
      ctx.tenant.id,
      { type },
    );

    return NextResponse.json({
      reportId: report.reportId,
      persistedId: report.persistedId,
      downloadUrl: report.downloadUrl,
      sizeBytes: report.sizeBytes,
      fileCount: report.fileCount,
      type: report.type,
      name: report.name,
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
