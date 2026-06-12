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

/** Same-origin workspace list — proxies FastAPI; falls back for staging when API is down. */
export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const token = await readSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const upstream = await fetch(`${platformApiBase()}/api/v1/workspace/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }

    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      fallbackWorkspaceList({
        userId: claims.userId,
        tenantId: claims.tenantId,
        plan: claims.plan,
      }),
    );
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
