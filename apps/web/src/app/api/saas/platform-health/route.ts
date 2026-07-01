import { NextResponse } from "next/server";

import {
  getSaasPlatformHealthService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const report = await getSaasPlatformHealthService().getReport(
      ctx.tenant.id,
      ctx.claims.userId,
    );
    return NextResponse.json(report);
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
