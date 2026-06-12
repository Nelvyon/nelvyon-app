import { NextResponse } from "next/server";

import { checkAuthConfig, checkDatabase } from "../../../../../../../backend/health/healthChecks";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const database = await checkDatabase();
  const auth = checkAuthConfig();
  const ok = database.status === "ok" && auth.status === "ok";
  return NextResponse.json(
    {
      status: ok ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      database: { status: database.status, latencyMs: database.latencyMs },
      auth: { status: auth.status, error: auth.error },
    },
    { status: ok ? 200 : 503, headers: NO_STORE },
  );
}
