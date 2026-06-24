export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasFacturasService,
} from "@nelvyon/saas";
import type { FacturaStatus } from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as FacturaStatus | null;
    const action = url.searchParams.get("action");

    const svc = getSaasFacturasService();

    if (action === "stats") {
      const stats = await svc.getStats(ctx.tenant.id);
      return NextResponse.json(stats);
    }

    const facturas = await svc.list(ctx.tenant.id, status ?? undefined);
    return NextResponse.json({ facturas });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const body = await req.json();
    const factura = await getSaasFacturasService().create(ctx.tenant.id, body);
    return NextResponse.json({ factura }, { status: 201 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
