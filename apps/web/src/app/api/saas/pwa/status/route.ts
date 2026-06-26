export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { getSaasPwaService, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

/** GET /api/saas/pwa/status — PWA install metadata + stats for this SaaS scope */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const status = await getSaasPwaService().getStatus(ctx.tenant.id);
    return NextResponse.json(status);
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
