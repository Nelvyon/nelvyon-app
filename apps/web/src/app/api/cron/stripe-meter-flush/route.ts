export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasStripeMeterService } from "@nelvyon/saas";
import { verifyCronBearer } from "@/lib/cronAuth";

/** POST /api/cron/stripe-meter-flush — report yesterday usage to Stripe (client-paid metered) */
export async function POST(req: Request) {
  const denied = verifyCronBearer(req.headers.get("authorization"));
  if (denied) return denied;
  const result = await getSaasStripeMeterService().flushDailyMeters();
  return NextResponse.json({ ok: true, ...result });
}
