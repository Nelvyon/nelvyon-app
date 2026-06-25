import { NextRequest, NextResponse } from "next/server";
import { requireSaasContext, getSaasApiKeysService, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const url = new URL(req.url);
    const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days") ?? "7")));

    // Verify key belongs to tenant
    const keyId = url.searchParams.get("keyId");
    if (keyId) {
      const keys = await getSaasApiKeysService().list(ctx.tenant.id);
      if (!keys.find(k => k.id === keyId)) {
        return NextResponse.json({ error: "Key not found" }, { status: 404 });
      }
    }

    const db = DbClient.getInstance();
    const rows = await db.query<Record<string, unknown>>(
      `SELECT
         day::date AS day,
         SUM(total_requests)::text   AS total_requests,
         SUM(success_requests)::text AS success_requests,
         SUM(error_requests)::text   AS error_requests,
         ROUND(AVG(avg_response_ms))::text AS avg_response_ms
       FROM api_key_usage_daily
       WHERE tenant_id = $1
         ${keyId ? "AND api_key_id = $3::uuid" : ""}
         AND day >= CURRENT_DATE - ($2::int - 1)
       GROUP BY day
       ORDER BY day ASC`,
      keyId ? [ctx.tenant.id, days, keyId] : [ctx.tenant.id, days],
    );

    return NextResponse.json({
      days,
      data: rows.map((r: Record<string, unknown>) => ({
        day:             String(r.day ?? "").slice(0, 10),
        totalRequests:   Number(r.total_requests   ?? 0),
        successRequests: Number(r.success_requests ?? 0),
        errorRequests:   Number(r.error_requests   ?? 0),
        avgResponseMs:   Number(r.avg_response_ms  ?? 0),
      })),
    });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
