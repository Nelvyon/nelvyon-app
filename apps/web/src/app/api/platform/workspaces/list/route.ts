import { NextResponse } from "next/server";

import { platformApiBase, readSessionToken } from "@/lib/platformFastApiProxy";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import {
  dbCreateWorkspace,
  dbListWorkspaces,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UNAVAILABLE = {
  error: "No se pudo cargar el workspace. Inténtalo de nuevo en unos minutos.",
};

async function upstreamFetch(token: string, path: string, init: RequestInit = {}) {
  return fetch(`${platformApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** Same-origin workspace list — FastAPI first, Postgres fallback when API staging is down. */
export async function GET(req: Request) {
  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
  if (claims instanceof NextResponse) return claims;

  const token = await readSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let upstream = await upstreamFetch(token, "/api/v1/workspace/list");
    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (upstream.ok) {
      const rows = await upstream.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return NextResponse.json(rows);
      }
    }

    const create = await upstreamFetch(token, "/api/v1/workspace/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Mi Workspace", slug: "default" }),
    });

    if (create.ok) {
      const created = await create.json();
      return NextResponse.json([
        {
          ...created,
          role: created.role ?? "owner",
          members_count: created.members_count ?? 1,
        },
      ]);
    }

    upstream = await upstreamFetch(token, "/api/v1/workspace/list");
    if (upstream.ok) {
      const rows = await upstream.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return NextResponse.json(rows);
      }
    }

    if (platformDbFallbackEnabled() && (upstreamFailed(upstream.status) || upstreamFailed(create.status))) {
      const rows = await dbListWorkspaces(claims);
      if (rows.length > 0) {
        return NextResponse.json(rows);
      }
    }

    return NextResponse.json(UNAVAILABLE, { status: 503 });
  } catch {
    if (platformDbFallbackEnabled()) {
      try {
        const rows = await dbListWorkspaces(claims);
        if (rows.length > 0) {
          return NextResponse.json(rows);
        }
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
}
