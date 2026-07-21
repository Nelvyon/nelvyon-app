import { NextResponse } from "next/server";

import { bffDegraded, BFF_DEGRADED_UPSTREAM } from "@/lib/bffDegraded";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPTY_SUMMARY = bffDegraded(
  {
    plan_id: "starter",
    plan_label: "Starter",
    billing_cycle: "monthly",
    next_billing_date: null as string | null,
    monthly_cost: 0,
    usage_alerts: 0,
    meters_at_risk: [] as string[],
    total_paid_ytd: 0,
    currency: "EUR",
  },
  BFF_DEGRADED_UPSTREAM,
);

/** Platform billing summary — FastAPI first, honest degraded fallback when upstream unavailable. */
export async function GET(req: Request) {
  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  if (claims instanceof NextResponse) return claims;

  try {
    const upstream = await proxyPlatformFetch(req, "GET", "/api/v1/billing/summary");
    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
    if (upstreamFailed(upstream.status)) {
      return NextResponse.json(EMPTY_SUMMARY);
    }
    const text = await upstream.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json(EMPTY_SUMMARY);
    }
  } catch {
    return NextResponse.json(EMPTY_SUMMARY);
  }
}
