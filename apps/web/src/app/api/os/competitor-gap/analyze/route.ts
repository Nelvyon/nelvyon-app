import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsCompetitorGapService, OsCompetitorGapError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { ownDomain, competitorUrl, sector?, hasProductCategory? } — start + analyze + complete. */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;
  const userId = (claims as { userId?: string }).userId;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      ownDomain?: string; competitorUrl?: string; sector?: string; hasProductCategory?: boolean;
    };
    if (!body.ownDomain?.trim() || !body.competitorUrl?.trim()) {
      return NextResponse.json({ error: "ownDomain y competitorUrl requeridos", code: "VALIDATION" }, { status: 400 });
    }
    const svc = getOsCompetitorGapService();
    const run = await svc.startRun({ ownDomain: body.ownDomain, competitorUrl: body.competitorUrl });
    const analyzed = await svc.analyzeRun(run.id, { userId, sector: body.sector, hasProductCategory: body.hasProductCategory });
    return NextResponse.json({ run: { ...analyzed, reportHtml: undefined } });
  } catch (e) {
    if (e instanceof OsCompetitorGapError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[os/competitor-gap/analyze POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
