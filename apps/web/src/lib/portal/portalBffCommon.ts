import { NextResponse } from "next/server";

import { platformDbFallbackEnabled } from "@/lib/platformDbFallback";

export const portalBffDynamic = { dynamic: "force-dynamic" as const, runtime: "nodejs" as const };

export function portalDbGuard(): NextResponse | null {
  if (!platformDbFallbackEnabled()) {
    return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });
  }
  return null;
}

export function portalErrorResponse(e: unknown, fallback = "portal request failed"): NextResponse {
  const message = e instanceof Error ? e.message : fallback;
  const lower = message.toLowerCase();
  if (lower.includes("unauthorized") || lower.includes("invalid email or password") || lower.includes("invalid portal")) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (lower.includes("not found")) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (
    lower.includes("required") ||
    lower.includes("already reviewed") ||
    lower.includes("must be published") ||
    lower.includes("invalid or expired")
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
