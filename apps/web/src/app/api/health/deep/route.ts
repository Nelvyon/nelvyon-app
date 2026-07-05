import { NextRequest, NextResponse } from "next/server";

import { healthHttpStatus, runDeepHealthChecks } from "../../../../../../../backend/health/healthChecks";
import { verifyCronFlexible } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** Deep health: DB, Redis, OpenAI, Stripe, SES (monitoring / SRE). Requires CRON_SECRET. */
export async function GET(req: NextRequest) {
  const denied = verifyCronFlexible(
    req.headers.get("x-cron-secret"),
    req.headers.get("authorization"),
  );
  if (denied) return denied;

  const body = await runDeepHealthChecks();
  return NextResponse.json(body, {
    status: healthHttpStatus(body.status),
    headers: NO_STORE,
  });
}
