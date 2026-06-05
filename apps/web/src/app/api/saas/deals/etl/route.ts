import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasDealsEtlService, getSaasOnboardingService } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST body: { "mode": "dry-run" }
 * Solo dry-run acotado al tenant autenticado. apply global → CLI `pnpm saas:deals-etl`.
 */
export async function POST(req: Request) {
  try {
    const claims = await authenticate(req);
    const onboarding = getSaasOnboardingService();
    const tenant = await onboarding.getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

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
    if (b.mode === "apply") {
      return NextResponse.json(
        {
          error:
            "apply is not allowed via API; use pnpm saas:deals-etl -- --apply --i-understand-apply from ops",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const etl = getSaasDealsEtlService();
    const report = await etl.run("dry-run", { tenantId: tenant.id });
    return NextResponse.json({ report, tenantId: tenant.id, scope: "tenant" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
