import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsCompetitorGapService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const svc = getOsCompetitorGapService();
    const [summary, runs] = await Promise.all([svc.getSummary(), svc.listRuns(50)]);
    return NextResponse.json({ summary, runs });
  } catch (e) {
    console.error("[os/competitor-gap GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
