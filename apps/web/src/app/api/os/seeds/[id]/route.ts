import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsEnvatoSeedService,
  OsEnvatoSeedError,
} from "../../../../../../../../backend/os-agents/seeds/OsEnvatoSeedService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { id } = await ctx.params;
    const seed = await getOsEnvatoSeedService().getSeed(id);
    return NextResponse.json({ seed });
  } catch (e) {
    if (e instanceof OsEnvatoSeedError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[os/seeds/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
