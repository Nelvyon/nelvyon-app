import { NextResponse } from "next/server";

import { EMPTY_CLIENT_LIST, proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { authenticatePlatformRequest, readJsonBody } from "@/lib/platformBffRoute";
import {
  dbCreateCampaign,
  dbGetCampaign,
  dbListCampaigns,
  dbResolveWorkspaceId,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPTY_CAMPAIGNS = { ...EMPTY_CLIENT_LIST };
const UPSTREAM = "/api/v1/entities/nelvyon_campaigns";

export async function GET(req: Request) {
  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(EMPTY_CAMPAIGNS);
  }
  if (claims instanceof NextResponse) return claims;

  try {
    const upstream = await proxyPlatformFetch(req, "GET", UPSTREAM);

    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (upstream.status === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (platformDbFallbackEnabled() && upstreamFailed(upstream.status)) {
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      if (workspaceId > 0) {
        return NextResponse.json(await dbListCampaigns(workspaceId, claims.userId));
      }
    }

    return NextResponse.json(EMPTY_CAMPAIGNS);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (platformDbFallbackEnabled()) {
      try {
        const workspaceId = await dbResolveWorkspaceId(req, claims);
        if (workspaceId > 0) {
          return NextResponse.json(await dbListCampaigns(workspaceId, claims.userId));
        }
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(EMPTY_CAMPAIGNS);
  }
}

export async function POST(req: Request) {
  const authError = await authenticatePlatformRequest(req);
  if (authError) return authError;

  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (claims instanceof NextResponse) return claims;

  const body = (await readJsonBody(req)) as Record<string, unknown>;
  const upstream = await proxyPlatformFetch(req, "POST", UPSTREAM, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  const text = await upstream.text();

  if (upstream.ok) {
    return NextResponse.json(text ? JSON.parse(text) : {}, { status: upstream.status });
  }

  if (upstream.status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (upstream.status === 403) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (platformDbFallbackEnabled() && upstreamFailed(upstream.status)) {
    try {
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      if (workspaceId > 0) {
        const created = await dbCreateCampaign(workspaceId, claims.userId, body);
        return NextResponse.json(created, { status: 201 });
      }
    } catch {
      /* fall through */
    }
  }

  try {
    return NextResponse.json(JSON.parse(text), { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "Servicio temporalmente no disponible. Inténtalo de nuevo en unos minutos." },
      { status: upstream.status >= 500 ? 503 : upstream.status },
    );
  }
}
