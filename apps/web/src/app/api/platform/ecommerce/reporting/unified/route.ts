import { NextResponse } from "next/server";

import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { BFF_DEGRADED_UPSTREAM } from "@/lib/bffDegraded";
import {
  EMPTY_STORE_ANALYTICS,
  EMPTY_STORES_LIST,
  EMPTY_UNIFIED_ECOMMERCE_DEGRADED,
  emptyUnifiedEcommerce,
  mergeUnifiedEcommerce,
} from "@/lib/ecommerceBffRoute";
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
    return NextResponse.json(EMPTY_UNIFIED_ECOMMERCE_DEGRADED);
  }
  if (claims instanceof NextResponse) return claims;

  try {
    const [storesRes, adsRes, campaignsRes] = await Promise.all([
      proxyPlatformFetch(req, "GET", "/api/os/store/projects"),
      proxyPlatformFetch(req, "GET", "/api/ads-agent/reporting/unified"),
      proxyPlatformFetch(req, "GET", "/api/v1/entities/nelvyon_campaigns"),
    ]);

    const storesList = (await safeJson(storesRes, EMPTY_STORES_LIST)) as typeof EMPTY_STORES_LIST;
    const ads = (await safeJson(adsRes, { unified: { total_spend: 0, blended_roas: 0 } })) as {
      unified?: { total_spend?: number; blended_roas?: number };
    };
    const campaigns = (await safeJson(campaignsRes, { items: [], total: 0 })) as {
      items?: Array<{ status?: string }>;
      total?: number;
    };

    const items = (storesList.items ?? []) as Array<{ id?: string }>;
    const analyticsSamples: typeof EMPTY_STORE_ANALYTICS[] = [];
    for (const item of items.slice(0, 5)) {
      if (!item.id) continue;
      const aRes = await proxyPlatformFetch(req, "GET", `/api/os/store/projects/${item.id}/analytics`);
      analyticsSamples.push(
        (await safeJson(aRes, EMPTY_STORE_ANALYTICS)) as typeof EMPTY_STORE_ANALYTICS,
      );
    }

    if (!storesRes.ok && upstreamFailed(storesRes.status)) {
      return NextResponse.json(emptyUnifiedEcommerce(BFF_DEGRADED_UPSTREAM));
    }

    const merged = mergeUnifiedEcommerce(
      storesList as { items?: Array<{ id?: string; status?: string }> },
      ads,
      campaigns,
      analyticsSamples,
    );
    if ((storesList.items?.length ?? 0) === 0 && merged.unified.total_revenue_cents === 0) {
      return NextResponse.json(emptyUnifiedEcommerce());
    }
    return NextResponse.json(merged);
  } catch {
    return NextResponse.json(EMPTY_UNIFIED_ECOMMERCE_DEGRADED);
  }
}
