import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsRegulatedSectorShieldService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** POST { sectorId, text, packRunId? } — manual shield scan (evaluate + persist). */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { sectorId?: string; text?: string; packRunId?: string };
    if (!body.sectorId?.trim() || typeof body.text !== "string") {
      return NextResponse.json({ error: "sectorId y text requeridos", code: "VALIDATION" }, { status: 400 });
    }
    const result = await getOsRegulatedSectorShieldService().evaluateAndPersist({
      sectorId: body.sectorId,
      packRunId: body.packRunId ?? null,
      htmlOrText: body.text,
    });
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[os/shield/evaluate POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
