import { NextResponse } from "next/server";

import { computeHelpdeskStats } from "@/lib/helpdeskSla";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import {
  dbListTickets,
  dbResolveWorkspaceId,
  platformDbFallbackEnabled,
  platformWorkspaceDeniedResponse,
} from "@/lib/platformDbFallback";
import type { JwtPayload } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM = "/api/v1/helpdesk/stats";

async function statsFromDb(req: Request, claims: JwtPayload) {
  const workspaceId = await dbResolveWorkspaceId(req, claims);
  if (workspaceId <= 0) return null;
  const list = await dbListTickets(workspaceId, claims.userId);
  return NextResponse.json(computeHelpdeskStats(list.items));
}

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
      return NextResponse.json(await upstream.json());
    }
    if (upstream.status === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (platformDbFallbackEnabled() && upstreamFailed(upstream.status)) {
      const dbRes = await statsFromDb(req, claims);
      if (dbRes) return dbRes;
    }

    return NextResponse.json(computeHelpdeskStats([]));
  } catch (e) {
    const denied = platformWorkspaceDeniedResponse(e);
    if (denied) return denied;
    if (platformDbFallbackEnabled()) {
      try {
        const dbRes = await statsFromDb(req, claims);
        if (dbRes) return dbRes;
      } catch (inner) {
        const innerDenied = platformWorkspaceDeniedResponse(inner);
        if (innerDenied) return innerDenied;
      }
    }
    return NextResponse.json(computeHelpdeskStats([]));
  }
}
