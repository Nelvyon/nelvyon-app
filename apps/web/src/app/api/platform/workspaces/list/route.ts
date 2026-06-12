import { NextResponse } from "next/server";

import {
  fallbackWorkspaceList,
  platformApiBase,
  readSessionToken,
} from "@/lib/platformFastApiProxy";
import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function workspaceFallbackResponse(claims: { userId: string; tenantId: string; plan: string }) {
  return NextResponse.json(
    fallbackWorkspaceList({
      userId: claims.userId,
      tenantId: claims.tenantId || claims.userId,
      plan: claims.plan,
    }),
  );
}

/** Same-origin workspace list — proxies FastAPI; falls back for staging when API is down. */
export async function GET(req: Request) {
  let claims: { userId: string; tenantId: string; plan: string };
  try {
    claims = await authenticate(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await readSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${platformApiBase()}/api/v1/workspace/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (upstream.ok) {
      try {
        return NextResponse.json(await upstream.json());
      } catch {
        return workspaceFallbackResponse(claims);
      }
    }
  } catch {
    /* FastAPI unreachable — use fallback workspace */
  }

  return workspaceFallbackResponse(claims);
}
