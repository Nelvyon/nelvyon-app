export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasFacturasService,
  getSaasWhiteLabelService,
} from "@nelvyon/saas";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const { id } = await params;

    const [factura, wlConfig] = await Promise.all([
      getSaasFacturasService().get(ctx.tenant.id, id),
      getSaasWhiteLabelService().getConfig(ctx.tenant.id),
    ]);
    if (!factura) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const html = getSaasFacturasService().generatePdfHtml(
      factura,
      wlConfig?.agencyName ?? "Nelvyon",
      wlConfig?.logoUrl ?? undefined,
    );

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="factura-${factura.invoiceNumber}.html"`,
      },
    });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
