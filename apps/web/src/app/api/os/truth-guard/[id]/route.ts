import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsTruthGuardService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { id } = await ctx.params;
    const audits = await getOsTruthGuardService().listAudits({ limit: 200 });
    const audit = audits.find((a) => a.id === id);
    if (!audit) return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ audit });
  } catch (e) {
    console.error("[os/truth-guard/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
