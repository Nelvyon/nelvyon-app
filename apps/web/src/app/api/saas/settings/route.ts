import { NextResponse } from "next/server";

import {
  buildSaasSettingsSummary,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const summary = buildSaasSettingsSummary(ctx.tenant, ctx.role);
    return NextResponse.json(summary);
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
