import { NextResponse } from "next/server";

import { adsBffGet, EMPTY_UNIFIED_REPORTING } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const res = await adsBffGet(req, "/api/ads-agent/reporting/unified", EMPTY_UNIFIED_REPORTING);
  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(EMPTY_UNIFIED_REPORTING);
  }
  const unified = body.unified as { total_spend?: number } | undefined;
  const google = body.google as { campaigns?: unknown[] } | undefined;
  const meta = body.meta as { campaigns?: unknown[] } | undefined;
  const spend = Number(unified?.total_spend ?? 0);
  const hasCampaigns = (google?.campaigns?.length ?? 0) > 0 || (meta?.campaigns?.length ?? 0) > 0;
  if (spend === 0 && !hasCampaigns) {
    return NextResponse.json(EMPTY_UNIFIED_REPORTING);
  }
  return NextResponse.json(body);
}
