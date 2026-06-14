import { NextResponse } from "next/server";

import { EMPTY_CLIENT_LIST, proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import {
  dbPipelineSummary,
  dbResolveWorkspaceId,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM = "/api/v1/crm/analytics/pipeline";

export async function GET(req: Request) {
  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ by_stage: [], items: [], stages: [], total_count: 0, total_value: 0 });
  }
  if (claims instanceof NextResponse) return claims;

  try {
    const upstream = await proxyPlatformFetch(req, "GET", UPSTREAM);

    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }

    if (platformDbFallbackEnabled() && upstreamFailed(upstream.status)) {
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      if (workspaceId > 0) {
        return NextResponse.json(await dbPipelineSummary(workspaceId, claims.userId));
      }
    }

    return NextResponse.json({ by_stage: [], items: [], stages: [], total_count: 0, total_value: 0 });
  } catch {
    if (platformDbFallbackEnabled()) {
      try {
        const workspaceId = await dbResolveWorkspaceId(req, claims);
        if (workspaceId > 0) {
          return NextResponse.json(await dbPipelineSummary(workspaceId, claims.userId));
        }
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json({ by_stage: [], items: [], stages: [], total_count: 0, total_value: 0 });
  }
}
