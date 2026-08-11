import { NextResponse } from "next/server";

import { EMPTY_CLIENT_LIST, proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { requirePlatformContext, requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { readJsonBody } from "@/lib/platformBffRoute";
import type { JwtPayload } from "@nelvyon/auth";
import {
  dbCreateDeal,
  dbListDeals,
  dbResolveWorkspaceId,
  platformDbFallbackEnabled,
  platformWorkspaceDeniedResponse,
} from "@/lib/platformDbFallback";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPTY_DEALS = { ...EMPTY_CLIENT_LIST };
const UPSTREAM = "/api/v1/entities/deals";

function parseClientId(req: Request): number | undefined {
  const url = new URL(req.url);
  const rawQuery = url.searchParams.get("query");
  if (!rawQuery) return undefined;
  try {
    const q = JSON.parse(decodeURIComponent(rawQuery)) as { client_id?: number };
    return q.client_id != null && q.client_id > 0 ? q.client_id : undefined;
  } catch {
    return undefined;
  }
}

async function createDealViaDb(
  req: Request,
  claims: JwtPayload,
  body: Record<string, unknown>,
): Promise<NextResponse | null> {
  if (!platformDbFallbackEnabled()) return null;
  try {
    const workspaceId = await dbResolveWorkspaceId(req, claims);
    if (workspaceId <= 0) return null;
    const created = await dbCreateDeal(workspaceId, claims.userId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const denied = platformWorkspaceDeniedResponse(e);
    if (denied) return denied;
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
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
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
      const workspaceId = await dbResolveWorkspaceId(req, claims);
      if (workspaceId > 0) {
        return NextResponse.json(
          await dbListDeals(workspaceId, claims.userId, parseClientId(req)),
        );
      }
    }

    return NextResponse.json(EMPTY_DEALS);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const denied = platformWorkspaceDeniedResponse(e);
    if (denied) return denied;
    if (platformDbFallbackEnabled()) {
      try {
        const workspaceId = await dbResolveWorkspaceId(req, claims);
        if (workspaceId > 0) {
          return NextResponse.json(
            await dbListDeals(workspaceId, claims.userId, parseClientId(req)),
          );
        }
      } catch (inner) {
        const innerDenied = platformWorkspaceDeniedResponse(inner);
        if (innerDenied) return innerDenied;
      }
    }
    return NextResponse.json(EMPTY_DEALS);
  }
}

export async function POST(req: Request) {
  // Autorización por capability ANTES de leer el cuerpo o mutar.
  const gate = await requirePlatformContext(req, "platform.crm.write", {
    allowImplicitWorkspace: true,
  });
  if (gate instanceof NextResponse) return gate;
  const claims = gate.claims;

  let body: Record<string, unknown> = {};
  try {
    body = (await readJsonBody(req)) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!String(body.title ?? "").trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
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
      const dbRes = await createDealViaDb(req, claims, body);
      if (dbRes) return dbRes;
    }

    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json(
        { error: "Servicio temporalmente no disponible." },
        { status: upstream.status >= 500 ? 503 : upstream.status },
      );
    }
  } catch {
    const dbRes = await createDealViaDb(req, claims, body);
    if (dbRes) return dbRes;
    return NextResponse.json({ error: "Servicio temporalmente no disponible." }, { status: 503 });
  }
}
