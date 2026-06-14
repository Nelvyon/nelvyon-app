import { NextResponse } from "next/server";

import { buildDemoAdsUnified } from "@/lib/demoDashboardData";
import { adsBffGet } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const demo = buildDemoAdsUnified();
  const res = await adsBffGet(req, "/api/ads-agent/reporting/unified", demo);
  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(demo);
  }
  const unified = body.unified as { total_spend?: number } | undefined;
  const google = body.google as { campaigns?: unknown[] } | undefined;
  const meta = body.meta as { campaigns?: unknown[] } | undefined;
  const spend = Number(unified?.total_spend ?? 0);
  const hasCampaigns = (google?.campaigns?.length ?? 0) > 0 || (meta?.campaigns?.length ?? 0) > 0;
  if (spend === 0 && !hasCampaigns) {
    return NextResponse.json(demo);
  }
  return NextResponse.json(body);
}
