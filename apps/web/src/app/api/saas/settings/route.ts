import { NextResponse } from "next/server";

import {
  buildSaasSettingsSummary,
  getSaasOnboardingService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const summary = buildSaasSettingsSummary(ctx.tenant, ctx.role);
    return NextResponse.json(summary);
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    const patch: {
      companyName?: string;
      industry?: string;
      website?: string | null;
      phone?: string | null;
    } = {};
    if (typeof b.companyName === "string") patch.companyName = b.companyName;
    if (typeof b.industry === "string") patch.industry = b.industry;
    if (b.website === null || typeof b.website === "string") patch.website = b.website as string | null;
    if (b.phone === null || typeof b.phone === "string") patch.phone = b.phone as string | null;

    const tenant = await getSaasOnboardingService().updateTenantProfile(ctx.tenant.id, patch);
    return NextResponse.json(buildSaasSettingsSummary(tenant, ctx.role));
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
