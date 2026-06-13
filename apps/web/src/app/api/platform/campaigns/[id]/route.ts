import { NextResponse } from "next/server";

import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { authenticatePlatformRequest, readJsonBody } from "@/lib/platformBffRoute";
import {
  dbGetCampaign,
  dbResolveWorkspaceId,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const entityPath = (id: string) => `/api/v1/entities/nelvyon_campaigns/${id}`;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const authError = await authenticatePlatformRequest(req);
  if (authError) return authError;

  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (claims instanceof NextResponse) return claims;

  const upstream = await proxyPlatformFetch(req, "GET", entityPath(id));
  const text = await upstream.text();

  if (upstream.ok) {
    return NextResponse.json(text ? JSON.parse(text) : {});
  }

  if (upstream.status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (upstream.status === 403) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (upstream.status === 404) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (platformDbFallbackEnabled() && upstreamFailed(upstream.status)) {
    try {
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      const campaignId = Number(id);
      if (workspaceId > 0 && Number.isFinite(campaignId)) {
        const row = await dbGetCampaign(campaignId, workspaceId, claims.userId);
        if (row) {
          return NextResponse.json(row);
        }
        return NextResponse.json({ error: "Not found" }, { status: 404 });
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

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJsonBody(req);
  const authError = await authenticatePlatformRequest(req);
  if (authError) return authError;

  const upstream = await proxyPlatformFetch(req, "PUT", entityPath(id), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  const text = await upstream.text();

  if (upstream.ok) {
    return NextResponse.json(text ? JSON.parse(text) : {});
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
