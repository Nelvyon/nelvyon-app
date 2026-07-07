import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus, getOsCompetitorGapService, OsCompetitorGapError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { execute?: boolean } — launch the recommended pack via Brief-to-Launch. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSaasContext(req, "reports.generate");
    const userId = auth.claims.userId;
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { execute?: boolean };
    const svc = getOsCompetitorGapService();
    await svc.getRun(id, auth.tenant.id);
    const run = await svc.launchRecommendedPack(id, { userId, execute: body.execute, tenantId: auth.tenant.id });
    return NextResponse.json({ run: { ...run, reportHtml: undefined } });
  } catch (e) {
    if (e instanceof OsCompetitorGapError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
