import { NextResponse } from "next/server";

import {
  buildSaasBillingSummary,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const summary = await buildSaasBillingSummary(ctx.tenant, ctx.role);
    return NextResponse.json(summary);
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
