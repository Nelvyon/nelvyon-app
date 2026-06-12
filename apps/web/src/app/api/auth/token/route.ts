import { NextResponse } from "next/server";

import { authenticate, extractToken } from "@nelvyon/auth";
import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Same-origin: expose Bearer token for FastAPI calls when session is cookie-only. */
export async function GET(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const claims = await authenticate(req);
    const auth = getAuthService();
    const profile = await auth.getUserProfile(claims.userId);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ token });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
