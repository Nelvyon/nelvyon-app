import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasDealsService, getSaasOnboardingService, SaasDealsError } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const onboarding = getSaasOnboardingService();
    const tenant = await onboarding.getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const deals = getSaasDealsService();
    const metrics = await deals.getMetrics(tenant.id);
    return NextResponse.json({ metrics });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasDealsError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}
