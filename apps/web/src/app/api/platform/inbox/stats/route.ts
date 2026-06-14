import { NextResponse } from "next/server";

import { computeHelpdeskStats } from "@/lib/helpdeskSla";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import {
  dbListTickets,
  dbResolveWorkspaceId,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM = "/api/v1/helpdesk/stats";

export async function GET(req: Request) {
  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(computeHelpdeskStats([]));
  }
  if (claims instanceof NextResponse) return claims;

  try {
    const upstream = await proxyPlatformFetch(req, "GET", UPSTREAM);
    if (upstream.ok) {
      const data = await upstream.json();
      return NextResponse.json(data);
    }

    if (platformDbFallbackEnabled() && upstreamFailed(upstream.status)) {
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      if (workspaceId > 0) {
        const list = await dbListTickets(workspaceId, claims.userId);
        return NextResponse.json(computeHelpdeskStats(list.items));
      }
    }

    const workspaceId = await dbResolveWorkspaceId(req, claims);
    if (workspaceId > 0 && platformDbFallbackEnabled()) {
      const list = await dbListTickets(workspaceId, claims.userId);
      return NextResponse.json(computeHelpdeskStats(list.items));
    }

    return NextResponse.json(computeHelpdeskStats([]));
  } catch {
    if (platformDbFallbackEnabled()) {
      try {
        const workspaceId = await dbResolveWorkspaceId(req, claims);
        const list = await dbListTickets(workspaceId, claims.userId);
        return NextResponse.json(computeHelpdeskStats(list.items));
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(computeHelpdeskStats([]));
  }
}
