import { NextResponse } from "next/server";
import { requirePublicApiContext } from "../../../../../../lib/requirePublicApiContext";
import { getSaasWebhookDlqService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/public/v2/webhooks/dlq — list failed webhook deliveries (scope: webhooks.read) */
export async function GET(req: Request) {
  const gate = await requirePublicApiContext(req, "webhooks.read");
  if (!gate.ok) return gate.response;

  try {
    const failures = await getSaasWebhookDlqService().listFailures(gate.ctx.tenantId);
    return NextResponse.json({ data: failures, total: failures.length }, { headers: gate.rateHeaders });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: gate.rateHeaders });
  }
}
