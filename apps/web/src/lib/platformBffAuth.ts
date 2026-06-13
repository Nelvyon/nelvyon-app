import { NextResponse } from "next/server";

import type { JwtPayload } from "@nelvyon/auth";
import { authenticate } from "@nelvyon/auth";
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

export function upstreamFailed(status: number): boolean {
  return status >= 500 || status === 502 || status === 503 || status === 504;
}
