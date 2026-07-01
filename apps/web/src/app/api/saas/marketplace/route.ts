export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasMarketplaceService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const apps = await getSaasMarketplaceService().listApps(ctx.tenant.id);
    return NextResponse.json({ apps });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as Record<string, unknown>;
    const svc = getSaasMarketplaceService();
    const appId = String(body.appId ?? "");
    if (body.action === "uninstall") {
      await svc.uninstall(ctx.tenant.id, appId);
    } else {
      await svc.install(ctx.tenant.id, appId);
    }
    return NextResponse.json({ apps: await svc.listApps(ctx.tenant.id) });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
