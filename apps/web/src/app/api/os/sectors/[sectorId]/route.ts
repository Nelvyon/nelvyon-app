import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsSectorReadinessService,
  OsSectorReadinessError,
} from "../../../../../../../../backend/os-agents/sectors/OsSectorReadinessService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ sectorId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { sectorId } = await ctx.params;
    const sector = await getOsSectorReadinessService().getSector(sectorId);
    return NextResponse.json({ sector });
  } catch (e) {
    if (e instanceof OsSectorReadinessError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[os/sectors/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
