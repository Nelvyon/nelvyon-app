import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsTemplateDnaService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** POST { sectorId? } — recompute DNA scores for one sector or all 20. */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { sectorId?: string };
    const svc = getOsTemplateDnaService();
    if (body.sectorId) {
      const top = await svc.refreshSector(body.sectorId);
      return NextResponse.json({ sectorId: body.sectorId, scored: top.length, top });
    }
    const result = await svc.refreshAll();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[os/template-dna/refresh POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
