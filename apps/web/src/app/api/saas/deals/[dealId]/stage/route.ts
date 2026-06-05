import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import {
  getSaasDealsService,
  getSaasOnboardingService,
  SaasDealsError,
  type DealStage,
} from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: Request, context: { params: Promise<{ dealId: string }> }) {
  try {
    const claims = await authenticate(req);
    const onboarding = getSaasOnboardingService();
    const tenant = await onboarding.getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const { dealId } = await context.params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    if (typeof b.stage !== "string") {
      return NextResponse.json({ error: "stage is required" }, { status: 400 });
    }

    const deals = getSaasDealsService();
    const deal = await deals.changeStage(
      tenant.id,
      dealId,
      b.stage as DealStage,
      typeof b.probability === "number" ? b.probability : undefined,
    );
    return NextResponse.json({ deal });
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
