import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsRecurringServicesService,
  getOsRecurringRunLogService,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST { tenantId, period? } — manually run the monthly recurring generation for a
 * tenant (platform admin). Idempotent: already-generated services are logged skipped.
 */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { tenantId?: string; period?: string };
    if (!body.tenantId) {
      return NextResponse.json({ error: "tenantId requerido", code: "VALIDATION" }, { status: 400 });
    }
    const runLog = getOsRecurringRunLogService();
    const period = body.period ?? runLog.periodKey();
    const svc = getOsRecurringServicesService();

    const deliverables = await svc.generateMonthlyDeliverables(body.tenantId, period);
    const runs = await runLog.recordGeneration(
      body.tenantId,
      period,
      deliverables.map((d) => ({ serviceType: d.serviceType, deliverableId: d.id })),
    );
    return NextResponse.json({
      tenantId: body.tenantId,
      period,
      generated: deliverables.length,
      runs,
    });
  } catch (e) {
    console.error("[os/recurring/trigger POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
