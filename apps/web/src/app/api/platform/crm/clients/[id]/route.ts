import { NextResponse } from "next/server";

import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import type { JwtPayload } from "@nelvyon/auth";
import {
  dbGetClient,
  dbResolveWorkspaceId,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";
import { authenticatePlatformRequest, readJsonBody } from "@/lib/platformBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const entityPath = (id: string) => `/api/v1/entities/nelvyon_clients/${id}`;

async function getClientViaDb(
  req: Request,
  claims: JwtPayload,
  clientId: number,
): Promise<NextResponse | null> {
  if (!platformDbFallbackEnabled()) return null;
  try {
    const workspaceId = await dbResolveWorkspaceId(req, claims);
    if (workspaceId <= 0 || !Number.isFinite(clientId)) return null;
    const row = await dbGetClient(clientId, workspaceId, claims.userId);
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

  const clientId = Number(id);

  try {
    const upstream = await proxyPlatformFetch(req, "GET", entityPath(id));
    const text = await upstream.text();

    if (upstream.ok) {
      return NextResponse.json(text ? JSON.parse(text) : {});
    }

    if (upstreamFailed(upstream.status)) {
      const dbRes = await getClientViaDb(req, claims, clientId);
      if (dbRes) return dbRes;
    }

    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: upstream.status });
    }
  } catch {
    const dbRes = await getClientViaDb(req, claims, clientId);
    if (dbRes) return dbRes;
    return NextResponse.json({ error: "Not found" }, { status: 503 });
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
    return NextResponse.json({ error: "Update failed" }, { status: upstream.status });
  }
}
