import { NextResponse } from "next/server";

import { checkDatabase } from "../../../../../../../backend/health/healthChecks";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const database = await checkDatabase();
  const ok = database.status === "ok";
  return NextResponse.json(
    {
      status: ok ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      database: { status: database.status, latencyMs: database.latencyMs },
    },
    { status: ok ? 200 : 503, headers: NO_STORE },
  );
}
