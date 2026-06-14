import { NextResponse } from "next/server";

import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { authenticatePlatformRequest, readJsonBody } from "@/lib/platformBffRoute";
import {
  dbGetTicket,
  dbResolveWorkspaceId,
  dbUpdateTicket,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const entityPath = (id: string) => `/api/v1/entities/helpdesk_tickets/${id}`;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ticketId = Number(id);
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const upstream = await proxyPlatformFetch(req, "GET", entityPath(id));
    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
    if (platformDbFallbackEnabled() && upstreamFailed(upstream.status)) {
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      const ticket = await dbGetTicket(ticketId, workspaceId, claims.userId);
      if (ticket) return NextResponse.json(ticket);
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch {
    if (platformDbFallbackEnabled()) {
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      const ticket = await dbGetTicket(ticketId, workspaceId, claims.userId);
      if (ticket) return NextResponse.json(ticket);
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ticketId = Number(id);
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const authError = await authenticatePlatformRequest(req);
  if (authError) return authError;

  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (claims instanceof NextResponse) return claims;

  let body: Record<string, unknown> = {};
  try {
    body = (await readJsonBody(req)) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const upstream = await proxyPlatformFetch(req, "PUT", entityPath(id), {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const text = await upstream.text();

    if (upstream.ok) {
      return NextResponse.json(text ? JSON.parse(text) : {});
    }

    if (upstreamFailed(upstream.status) && platformDbFallbackEnabled()) {
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      const updated = await dbUpdateTicket(ticketId, workspaceId, claims.userId, body);
      if (updated) return NextResponse.json(updated);
    }

    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json({ error: "Update failed" }, { status: 503 });
    }
  } catch {
    if (platformDbFallbackEnabled()) {
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      const updated = await dbUpdateTicket(ticketId, workspaceId, claims.userId, body);
      if (updated) return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Update failed" }, { status: 503 });
  }
}
