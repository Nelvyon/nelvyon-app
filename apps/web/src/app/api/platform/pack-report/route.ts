import { NextResponse } from "next/server";

import { fetchLocalPackCeoMetrics } from "@/lib/packs/localPackCeoMetrics";
import { fetchSaasB2bCeoMetrics } from "@/lib/packs/saasB2bPackCeoMetrics";
import { listPackRunsForWorkspace } from "@/lib/packs/packRunStore";
import { LOCAL_GROWTH_PACK_ID, SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";
import { requirePlatformClaims } from "@/lib/platformBffAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }

  const url = new URL(req.url);
  const packId = url.searchParams.get("pack_id")?.trim() || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 5) || 5, 20);

  const runs = await listPackRunsForWorkspace(workspaceId, limit, packId);
  const latest = runs.find((r) => r.status === "completed" || r.status === "needs_review") ?? runs[0];

  let live_ceo_metrics = null;
  const effectivePackId = packId ?? latest?.pack_id;
  if (effectivePackId === LOCAL_GROWTH_PACK_ID && latest?.report) {
    const kpis = latest.report.kpis;
    live_ceo_metrics = await fetchLocalPackCeoMetrics({
      req,
      workspaceId,
      userId: claims.userId,
      campaignId: kpis.saas_campaign_id,
      welcomeFallback: {
        status: kpis.welcome_email_status,
        touches: kpis.welcome_touches,
      },
    });
  } else if (effectivePackId === SAAS_B2B_GROWTH_PACK_ID && latest?.report) {
    const kpis = latest.report.kpis;
    live_ceo_metrics = await fetchSaasB2bCeoMetrics({
      req,
      workspaceId,
      userId: claims.userId,
      campaignId: kpis.saas_campaign_id,
      nurtureFallback: {
        status: kpis.nurture_email_status,
        touches: kpis.nurture_touches,
      },
    });
  }

  return NextResponse.json({
    items: runs,
    latest: latest ?? null,
    live_ceo_metrics,
  });
}
