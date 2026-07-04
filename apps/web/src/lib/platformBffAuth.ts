import { NextResponse } from "next/server";

import type { JwtPayload } from "@nelvyon/auth";
import { authenticate } from "@nelvyon/auth";
import { getNelvyonAdminService } from "@nelvyon/admin";
import { OsAgentError } from "@nelvyon/os-agents";

export async function requirePlatformClaims(
  req: Request,
): Promise<JwtPayload | NextResponse> {
  try {
    return await authenticate(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

/** Platform admin only — for OS cron triggers and learning loops. */
export async function requirePlatformAdmin(
  req: Request,
): Promise<JwtPayload | NextResponse> {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;
  const isAdmin = await getNelvyonAdminService().isUserAdmin(claims.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return claims;
}

/** FastAPI may 401/403 when workspace context mismatches — treat as degraded upstream. */
export function upstreamFailed(status: number): boolean {
  return (
    status === 401 ||
    status === 403 ||
    status >= 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}
