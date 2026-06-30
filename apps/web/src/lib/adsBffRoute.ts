import { NextResponse } from "next/server";

import { bffDegraded, BFF_DEGRADED_OAUTH, BFF_DEGRADED_UPSTREAM } from "@/lib/bffDegraded";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { readJsonBody } from "@/lib/platformBffRoute";
import { OsAgentError } from "@nelvyon/os-agents";

export const EMPTY_UNIFIED_REPORTING = bffDegraded(
  {
    google: { summary: {} as Record<string, number>, campaigns: [] as unknown[] },
    meta: { summary: {} as Record<string, number>, campaigns: [] as unknown[] },
    unified: { total_spend: 0, blended_roas: 0 },
  },
  BFF_DEGRADED_UPSTREAM,
);

export const EMPTY_ROAS_ALERTS = {
  threshold: 1.5,
  alerts: [] as Array<{ platform: string; message: string; severity: string }>,
};

export const EMPTY_PLATFORM_STATUS = bffDegraded(
  { oauth_configured: false, connected: false },
  BFF_DEGRADED_OAUTH,
);

export const EMPTY_CAMPAIGNS = bffDegraded(
  { campaigns: [] as unknown[] },
  BFF_DEGRADED_UPSTREAM,
);

export const EMPTY_REPORTING = bffDegraded(
  {
    summary: {} as Record<string, number>,
    campaigns: [] as unknown[],
  },
  BFF_DEGRADED_UPSTREAM,
);

async function resolveClaims(req: Request) {
  try {
    return await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }
}

export async function adsBffGet(req: Request, upstreamPath: string, fallback: unknown) {
  const claims = await resolveClaims(req);
  if (claims instanceof NextResponse) {
    if (claims.status === 401 || claims.status === 403) {
      return NextResponse.json(fallback);
    }
    return claims;
  }
  if (!claims) return NextResponse.json(fallback);

  try {
    const upstream = await proxyPlatformFetch(req, "GET", upstreamPath);
    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
    if (upstream.status === 404) {
      const text = await upstream.text();
      try {
        return NextResponse.json(JSON.parse(text), { status: 404 });
      } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
    return NextResponse.json(fallback);
  } catch {
    return NextResponse.json(fallback);
  }
}

export async function adsBffPost(req: Request, upstreamPath: string, fallback: unknown) {
  const claims = await resolveClaims(req);
  if (claims instanceof NextResponse) {
    if (claims.status === 401 || claims.status === 403) {
      return NextResponse.json(fallback);
    }
    return claims;
  }
  if (!claims) return NextResponse.json(fallback);

  let body: unknown = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await proxyPlatformFetch(req, "POST", upstreamPath, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    if (upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(text ? JSON.parse(text) : {}, { status: upstream.status });
    }
    if (upstreamFailed(upstream.status)) {
      return NextResponse.json(fallback);
    }
    const text = await upstream.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json(fallback);
    }
  } catch {
    return NextResponse.json(fallback);
  }
}
