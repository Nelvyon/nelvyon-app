import { NextResponse } from "next/server";

import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { BFF_DEGRADED_UPSTREAM } from "@/lib/bffDegraded";
import {
  EMPTY_FUNNEL_ANALYTICS,
  EMPTY_FUNNELS_LIST,
  EMPTY_UNIFIED_FUNNELS_DEGRADED,
  emptyUnifiedFunnels,
  mergeUnifiedFunnels,
} from "@/lib/funnelsBffRoute";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function safeJson(res: Response, fallback: unknown) {
  if (!res.ok) return fallback;
  try {
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(EMPTY_UNIFIED_FUNNELS_DEGRADED);
  }
  if (claims instanceof NextResponse) return claims;

  try {
    const [funnelsRes, dealsRes, adsRes] = await Promise.all([
      proxyPlatformFetch(req, "GET", "/api/funnels"),
      proxyPlatformFetch(req, "GET", "/api/v1/entities/deals"),
      proxyPlatformFetch(req, "GET", "/api/ads-agent/reporting/unified"),
    ]);

    const funnelsList = (await safeJson(funnelsRes, EMPTY_FUNNELS_LIST)) as typeof EMPTY_FUNNELS_LIST;
    const deals = (await safeJson(dealsRes, { items: [], total: 0 })) as {
      items?: unknown[];
      total?: number;
    };
    const ads = (await safeJson(adsRes, { unified: { total_spend: 0, blended_roas: 0 } })) as {
      unified?: { total_spend?: number; blended_roas?: number };
    };

    const items = (funnelsList.items ?? []) as Array<{ id?: string }>;
    const analyticsSamples: typeof EMPTY_FUNNEL_ANALYTICS[] = [];
    for (const item of items.slice(0, 5)) {
      if (!item.id) continue;
      const aRes = await proxyPlatformFetch(req, "GET", `/api/funnels/${item.id}/analytics`);
      analyticsSamples.push(
        (await safeJson(aRes, EMPTY_FUNNEL_ANALYTICS)) as typeof EMPTY_FUNNEL_ANALYTICS,
      );
    }

    if (!funnelsRes.ok && upstreamFailed(funnelsRes.status)) {
      return NextResponse.json(emptyUnifiedFunnels(BFF_DEGRADED_UPSTREAM));
    }

    const merged = mergeUnifiedFunnels(
      funnelsList as { items?: Array<{ status?: string; step_count?: number }> },
      deals,
      ads,
      analyticsSamples,
    );
    if ((funnelsList.items?.length ?? 0) === 0 && merged.unified.total_visits === 0) {
      return NextResponse.json(emptyUnifiedFunnels());
    }
    return NextResponse.json(merged);
  } catch {
    return NextResponse.json(EMPTY_UNIFIED_FUNNELS_DEGRADED);
  }
}
