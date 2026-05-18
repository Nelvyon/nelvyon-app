import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasCampaniasService, getSaasOnboardingService, SaasCampaniasError } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ campaniaId: string }> }) {
  try {
    const claims = await authenticate(req);
    const { campaniaId } = await ctx.params;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const campania = await getSaasCampaniasService().pauseCampania(tenant.id, campaniaId);
    return NextResponse.json({ campania });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasCampaniasError) return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    throw e;
  }
}
