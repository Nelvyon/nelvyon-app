import { NextResponse } from "next/server";

import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { requirePlatformContext, requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { authenticatePlatformRequest, readJsonBody } from "@/lib/platformBffRoute";
import type { JwtPayload } from "@nelvyon/auth";
import {
  dbGetCampaign,
  dbResolveWorkspaceId,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const entityPath = (id: string) => `/api/v1/entities/nelvyon_campaigns/${id}`;

async function getCampaignViaDb(
  req: Request,
  claims: JwtPayload,
  campaignId: number,
): Promise<NextResponse | null> {
  if (!platformDbFallbackEnabled()) return null;
  try {
    const workspaceId = await dbResolveWorkspaceId(req, claims);
    if (workspaceId <= 0 || !Number.isFinite(campaignId)) return null;
    const row = await dbGetCampaign(campaignId, workspaceId, claims.userId);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch {
    return null;
  }
}

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

  const campaignId = Number(id);

  try {
    const upstream = await proxyPlatformFetch(req, "GET", entityPath(id), {}, { requireWorkspace: true });
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
      const dbRes = await getCampaignViaDb(req, claims, campaignId);
      if (dbRes) return dbRes;
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (upstreamFailed(upstream.status)) {
      const dbRes = await getCampaignViaDb(req, claims, campaignId);
      if (dbRes) return dbRes;
    }

    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json(
        { error: "Servicio temporalmente no disponible. Inténtalo de nuevo en unos minutos." },
        { status: upstream.status >= 500 ? 503 : upstream.status },
      );
    }
  } catch {
    const dbRes = await getCampaignViaDb(req, claims, campaignId);
    if (dbRes) return dbRes;
    return NextResponse.json(
      { error: "Servicio temporalmente no disponible. Inténtalo de nuevo en unos minutos." },
      { status: 503 },
    );
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // La autorización se adelanta al `readJsonBody`: antes se leía el cuerpo
  // antes de comprobar nada.
  // Autorización por capability ANTES de leer el cuerpo o mutar.
  const gate = await requirePlatformContext(req, "platform.crm.write", {
    allowImplicitWorkspace: true,
  });
  if (gate instanceof NextResponse) return gate;
  const body = await readJsonBody(req);

  const upstream = await proxyPlatformFetch(req, "PUT", entityPath(id), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }, { requireWorkspace: true });
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
