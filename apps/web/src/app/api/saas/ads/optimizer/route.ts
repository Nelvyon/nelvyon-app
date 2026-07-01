export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasAdsOptimizerService,
  getSaasAdsDashboardService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "analytics.read");
    const rules = await getSaasAdsOptimizerService().listRules(ctx.tenant.id);
    return NextResponse.json({ rules });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "analytics.read");
    const body = (await req.json()) as Record<string, unknown>;
    const svc = getSaasAdsOptimizerService();

    if (body.action === "evaluate") {
      const ads = getSaasAdsDashboardService();
      const alerts = await ads.getRoasAlerts(ctx.tenant.id, Number(body.roasThreshold ?? 1.5));
      const metrics = alerts.map((a) => ({
        platform: a.platform,
        roas: a.roas,
        spend: a.spend,
      }));
      const actions = await svc.evaluateRules(ctx.tenant.id, metrics);
      return NextResponse.json({ actions, alerts });
    }

    const rule = await svc.upsertRule(ctx.tenant.id, {
      id: body.id ? String(body.id) : undefined,
      platform: String(body.platform ?? "meta"),
      name: String(body.name ?? "Regla"),
      conditionJson: (body.conditionJson ?? {}) as Record<string, unknown>,
      actionJson: (body.actionJson ?? { type: "pause" }) as Record<string, unknown>,
      enabled: body.enabled !== false,
    });
    return NextResponse.json({ rule });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
