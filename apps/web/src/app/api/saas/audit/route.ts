export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasAuditService,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const svc = getSaasAuditService();

    if (action === "stats") {
      const stats = await svc.getModuleStats(ctx.tenant.id);
      return NextResponse.json({ stats });
    }

    const entries = await svc.list(ctx.tenant.id, {
      module: url.searchParams.get("module") ?? undefined,
      userId: url.searchParams.get("userId") ?? undefined,
      action: url.searchParams.get("action_filter") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
      offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : undefined,
    });
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json();
    await getSaasAuditService().log(ctx.tenant.id, {
      userId: ctx.claims.userId,
      ...body,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
