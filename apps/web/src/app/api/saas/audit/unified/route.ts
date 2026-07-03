export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasUnifiedAuditExportService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

/** GET /api/saas/audit/unified?format=csv|pdf */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "audit.read");
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json";
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;

    const svc = getSaasUnifiedAuditExportService();
    const rows = await svc.list(ctx.tenant.id, { from, to });

    if (format === "csv") {
      const csv = svc.toCsv(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="nelvyon-audit-${ctx.tenant.id.slice(0, 8)}.csv"`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = svc.toPdf(rows);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="nelvyon-audit-${ctx.tenant.id.slice(0, 8)}.pdf"`,
        },
      });
    }

    return NextResponse.json({ rows, total: rows.length });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
