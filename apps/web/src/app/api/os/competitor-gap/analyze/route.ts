import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus, getOsCompetitorGapService, OsCompetitorGapError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { ownDomain, competitorUrl, sector?, hasProductCategory? } — start + analyze + complete. */
export async function POST(req: Request) {
  try {
    const auth = await requireSaasContext(req, "analytics.read");
    const userId = auth.claims.userId;
    const body = (await req.json().catch(() => ({}))) as {
      ownDomain?: string; competitorUrl?: string; sector?: string; hasProductCategory?: boolean;
    };
    if (!body.ownDomain?.trim() || !body.competitorUrl?.trim()) {
      return NextResponse.json({ error: "ownDomain y competitorUrl requeridos", code: "VALIDATION" }, { status: 400 });
    }
    const svc = getOsCompetitorGapService();
    const run = await svc.startRun({
      ownDomain: body.ownDomain,
      competitorUrl: body.competitorUrl,
      tenantId: auth.tenant.id,
      workspaceId: auth.tenant.workspaceId ?? null,
    });
    const analyzed = await svc.analyzeRun(run.id, { userId, sector: body.sector, hasProductCategory: body.hasProductCategory });
    return NextResponse.json({ run: { ...analyzed, reportHtml: undefined } });
  } catch (e) {
    if (e instanceof OsCompetitorGapError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
