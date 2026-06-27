import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsCompetitorGapService, OsCompetitorGapError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { id } = await ctx.params;
    const run = await getOsCompetitorGapService().getRun(id);
    const html = run.reportHtml ?? `<!doctype html><body>Informe no generado (status: ${run.status})</body>`;
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof OsCompetitorGapError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[os/competitor-gap/[id]/html GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
