import { NextResponse } from "next/server";

import { platformApiBase, readSessionToken } from "@/lib/platformFastApiProxy";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { dbCreateWorkspace, platformDbFallbackEnabled } from "@/lib/platformDbFallback";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UNAVAILABLE = {
  error: "No se pudo crear el workspace. Inténtalo de nuevo en unos minutos.",
};

async function upstreamFetch(token: string, init: RequestInit) {
  return fetch(`${platformApiBase()}/api/v1/workspace/create`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function POST(req: Request) {
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

  let body: { name?: string; slug?: string | null } = {};
  try {
    body = (await req.json()) as { name?: string; slug?: string | null };
  } catch {
    body = {};
  }

  try {
    const upstream = await upstreamFetch(token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const text = await upstream.text();
    if (upstream.ok) {
      return NextResponse.json(JSON.parse(text || "{}"), { status: upstream.status });
    }

    if (platformDbFallbackEnabled() && upstreamFailed(upstream.status)) {
      const created = await dbCreateWorkspace(claims, {
        name: body.name?.trim() || "Mi Workspace",
        slug: body.slug ?? "default",
      });
      return NextResponse.json(created, { status: 201 });
    }

    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json(UNAVAILABLE, { status: upstream.status >= 500 ? 503 : upstream.status });
    }
  } catch {
    if (platformDbFallbackEnabled()) {
      try {
        const created = await dbCreateWorkspace(claims, {
          name: body.name?.trim() || "Mi Workspace",
          slug: body.slug ?? "default",
        });
        return NextResponse.json(created, { status: 201 });
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
}
