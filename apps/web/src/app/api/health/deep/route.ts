import { NextResponse } from "next/server";

import { healthHttpStatus, runDeepHealthChecks } from "../../../../../../../backend/health/healthChecks";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** Deep health: DB, Redis, OpenAI, Stripe, SES (monitoring / SRE). */
export async function GET() {
  const body = await runDeepHealthChecks();
  return NextResponse.json(body, {
    status: healthHttpStatus(body.status),
    headers: NO_STORE,
  });
}
