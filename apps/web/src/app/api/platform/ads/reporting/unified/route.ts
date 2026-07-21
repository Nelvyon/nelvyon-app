import { NextResponse } from "next/server";

import { adsBffGet, EMPTY_UNIFIED_REPORTING } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Pass through healthy upstream (including real zero-spend empty state).
 * Only substitute EMPTY_UNIFIED_REPORTING when the BFF itself degraded/failed.
 */
export async function GET(req: Request) {
  const res = await adsBffGet(req, "/api/ads-agent/reporting/unified", EMPTY_UNIFIED_REPORTING);
  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(EMPTY_UNIFIED_REPORTING);
  }
  if (body.degraded === true) {
    return NextResponse.json(body, { status: res.status >= 400 ? res.status : 200 });
  }
  return NextResponse.json(body, { status: res.status });
}
