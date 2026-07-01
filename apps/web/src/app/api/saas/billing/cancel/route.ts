export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { DbClient } from "../../../../../../../../backend/db/DbClient";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "cancel_at_period_end");
    const db = DbClient.getInstance();

    if (action === "pause") {
      await db.query(
        `UPDATE saas_tenants SET billing_status='paused', updated_at=NOW() WHERE id=$1`,
        [ctx.tenant.id],
      );
      return NextResponse.json({ ok: true, status: "paused" });
    }

    await db.query(
      `UPDATE saas_tenants SET billing_status='cancel_at_period_end', updated_at=NOW() WHERE id=$1`,
      [ctx.tenant.id],
    );
    return NextResponse.json({
      ok: true,
      status: "cancel_at_period_end",
      feedback: body.feedback ? String(body.feedback) : null,
    });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
