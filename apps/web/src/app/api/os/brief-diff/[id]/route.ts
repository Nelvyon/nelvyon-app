import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsBriefDiffRerunService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(_req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { id } = await ctx.params;
    const diff = await getOsBriefDiffRerunService().getDiff(id);
    if (!diff) return NextResponse.json({ error: "Diff not found" }, { status: 404 });
    return NextResponse.json({ diff });
  } catch (e) {
    console.error("[os/brief-diff/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
