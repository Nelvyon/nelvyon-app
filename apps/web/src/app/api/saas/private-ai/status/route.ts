export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasPrivateAiService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasPrivateAiService();
    const status = await svc.getPlatformStatus(ctx.tenant.id);
    let router: Awaited<ReturnType<typeof svc.getRouterHealthStatus>> | undefined;
    let routerHealthAvailable = true;
    try {
      router = await svc.getRouterHealthStatus();
    } catch {
      router = undefined;
      routerHealthAvailable = false;
    }
    return NextResponse.json({
      ...status,
      routerCertified: true,
      router,
      routerHealthAvailable,
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
