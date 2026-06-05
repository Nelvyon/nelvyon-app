import { NextResponse } from "next/server";

import {
  getSaasDealsService,
  requireSaasContext,
  SaasDealsError,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "deals.read");
    const metrics = await getSaasDealsService().getMetrics(ctx.tenant.id);
    return NextResponse.json({ metrics });
  } catch (e: unknown) {
    if (e instanceof SaasDealsError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
