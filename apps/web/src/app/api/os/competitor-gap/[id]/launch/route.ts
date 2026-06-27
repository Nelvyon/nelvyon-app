import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsCompetitorGapService, OsCompetitorGapError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { execute?: boolean } — launch the recommended pack via Brief-to-Launch. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;
  const userId = (claims as { userId?: string }).userId;

  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { execute?: boolean };
    const run = await getOsCompetitorGapService().launchRecommendedPack(id, { userId, execute: body.execute });
    return NextResponse.json({ run: { ...run, reportHtml: undefined } });
  } catch (e) {
    if (e instanceof OsCompetitorGapError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[os/competitor-gap/[id]/launch POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
