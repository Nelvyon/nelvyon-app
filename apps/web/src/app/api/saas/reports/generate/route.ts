import { NextResponse } from "next/server";

import { getSaasDashboardReportService } from "@nelvyon/saas-reports";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Genera informe ZIP del dashboard con métricas reales del cliente y devuelve URL de descarga. */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");

    const report = await getSaasDashboardReportService().generateAndPublish(
      ctx.claims.userId,
      ctx.tenant.id,
    );

    return NextResponse.json({
      reportId: report.reportId,
      downloadUrl: report.downloadUrl,
      sizeBytes: report.sizeBytes,
      fileCount: report.fileCount,
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
