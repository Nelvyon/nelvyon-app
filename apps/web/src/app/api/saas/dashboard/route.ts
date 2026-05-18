import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasDashboardService, getSaasOnboardingService, SaasDashboardError } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const onboarding = getSaasOnboardingService();
    const tenant = await onboarding.getTenant(claims.userId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const dashboard = getSaasDashboardService();
    const summary = await dashboard.getDashboardSummary(tenant.id);
    return NextResponse.json(summary);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasDashboardError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}
