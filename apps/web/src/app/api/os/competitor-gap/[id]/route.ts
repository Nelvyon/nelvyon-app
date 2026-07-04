import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus, getOsCompetitorGapService, OsCompetitorGapError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSaasContext(req, "analytics.read");
    const { id } = await ctx.params;
    const run = await getOsCompetitorGapService().getRun(id, auth.tenant.id);
    return NextResponse.json({ run: { ...run, reportHtml: undefined } });
  } catch (e) {
    if (e instanceof OsCompetitorGapError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
