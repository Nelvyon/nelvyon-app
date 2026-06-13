import { NextResponse } from "next/server";

import { platformApiBase, readSessionToken } from "@/lib/platformFastApiProxy";
import { authenticate } from "@nelvyon/auth";
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

/** Same-origin workspace list — real FastAPI workspaces only (no synthetic fallback). */
export async function GET(req: Request) {
  try {
    await authenticate(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }

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

    return NextResponse.json(UNAVAILABLE, { status: 503 });
  } catch {
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
}
