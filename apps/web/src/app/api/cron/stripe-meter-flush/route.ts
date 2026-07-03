export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasStripeMeterService } from "@nelvyon/saas";

function assertCron(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** POST /api/cron/stripe-meter-flush — report yesterday usage to Stripe (client-paid metered) */
export async function POST(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;
  const result = await getSaasStripeMeterService().flushDailyMeters();
  return NextResponse.json({ ok: true, ...result });
}
