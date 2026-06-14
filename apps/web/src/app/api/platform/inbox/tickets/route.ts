import { NextResponse } from "next/server";

import { EMPTY_CLIENT_LIST, proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { authenticatePlatformRequest, readJsonBody } from "@/lib/platformBffRoute";
import type { JwtPayload } from "@nelvyon/auth";
import {
  dbCreateTicket,
  dbListTickets,
  dbResolveWorkspaceId,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPTY_TICKETS = { ...EMPTY_CLIENT_LIST };
const UPSTREAM = "/api/v1/entities/helpdesk_tickets";

async function createTicketViaDb(
  req: Request,
  claims: JwtPayload,
  body: Record<string, unknown>,
): Promise<NextResponse | null> {
  if (!platformDbFallbackEnabled()) return null;
  try {
    const workspaceId = await dbResolveWorkspaceId(req, claims);
    if (workspaceId <= 0) return null;
    const created = await dbCreateTicket(workspaceId, claims.userId, body);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return null;
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
    return NextResponse.json(EMPTY_TICKETS);
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
        return NextResponse.json(await dbListTickets(workspaceId, claims.userId));
      }
    }

    return NextResponse.json(EMPTY_TICKETS);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (platformDbFallbackEnabled()) {
      try {
        const workspaceId = await dbResolveWorkspaceId(req, claims);
        if (workspaceId > 0) {
          return NextResponse.json(await dbListTickets(workspaceId, claims.userId));
        }
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(EMPTY_TICKETS);
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

  let body: Record<string, unknown> = {};
  try {
    body = (await readJsonBody(req)) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await proxyPlatformFetch(req, "POST", UPSTREAM, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const text = await upstream.text();

    if (upstream.ok) {
      return NextResponse.json(text ? JSON.parse(text) : {}, { status: upstream.status });
    }

    if (upstreamFailed(upstream.status)) {
      const dbRes = await createTicketViaDb(req, claims, body);
      if (dbRes) return dbRes;
    }

    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
    }
  } catch {
    const dbRes = await createTicketViaDb(req, claims, body);
    if (dbRes) return dbRes;
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }
}
