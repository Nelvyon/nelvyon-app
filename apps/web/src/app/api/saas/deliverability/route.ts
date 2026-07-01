export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasDeliverabilityService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "campanias.read");
    const svc = getSaasDeliverabilityService();
    const url = new URL(req.url);
    if (url.searchParams.get("resource") === "suppressions") {
      return NextResponse.json({ suppressions: await svc.listSuppressions(ctx.tenant.id) });
    }
    const snapshot = (await svc.getLatest(ctx.tenant.id)) ?? (await svc.captureSnapshot(ctx.tenant.id));
    return NextResponse.json({ snapshot });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "campanias.write");
    const body = (await req.json()) as Record<string, unknown>;
    const svc = getSaasDeliverabilityService();
    const action = String(body.action ?? "refresh");

    if (action === "dedicated-ip") {
      const cfg = await svc.setDedicatedIp(ctx.tenant.id, {
        dedicatedIp: body.dedicatedIp ? String(body.dedicatedIp) : null,
        warmupDay: Number(body.warmupDay ?? 0),
      });
      return NextResponse.json({ cfg });
    }
    if (action === "warmup-advance") {
      return NextResponse.json({ warmupDay: await svc.advanceWarmup(ctx.tenant.id) });
    }
    return NextResponse.json({ snapshot: await svc.captureSnapshot(ctx.tenant.id) });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
