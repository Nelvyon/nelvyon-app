export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasTwilioRebillingService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const svc = getSaasTwilioRebillingService();
    const [entries, summary] = await Promise.all([
      svc.list(ctx.tenant.id),
      svc.getSummary(ctx.tenant.id),
    ]);
    return NextResponse.json({ entries, summary });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as { period?: string };
    const period = body.period ?? new Date().toISOString().slice(0, 7);
    const entries = await getSaasTwilioRebillingService().rollupPeriod(ctx.tenant.id, period);
    return NextResponse.json({ entries, period });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
